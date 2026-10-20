import { config } from "@/lib/config";
import { Guide, type Claim } from "@/lib/schema";
import { readComposio, type ComposioInfo } from "./composio-page";
import { discover, type Discovery } from "./discover";
import { extractFindings } from "./extract";
import { loadPages } from "./pages";
import { probePortal } from "./probe";
import { PROFILES, type Profile } from "./profile";
import { writeGuide, type WriterOutput } from "./writer";
import type { AttemptStep, Emit, Finding, StageName } from "./types";

// Scripts must take withBudget from here (see the note in lib/llm.ts).
export { withBudget } from "@/lib/llm";

// Optional stage cache, used by the CLI so a late failure does not repeat earlier work.
export type Checkpoint = {
  load<T>(stage: string): Promise<T | undefined>;
  save(stage: string, data: unknown): Promise<void>;
};

// Pipeline: the model never browses. A small model picks pages, code downloads and trims them,
// one model call extracts quoted facts, code checks every quote against its page, one model call
// writes the guide. Same function for the CLI (library) and the live route.
export async function generateGuide(
  query: string,
  emit: Emit,
  profile: Profile = PROFILES.live,
  checkpoint?: Checkpoint,
): Promise<Guide> {
  const run = async <T>(stage: StageName, fn: (log: (m: string) => void) => Promise<T>, note?: string) => {
    const cached = await checkpoint?.load<T>(stage);
    if (cached !== undefined) {
      emit({ type: "stage", stage, status: "done", note: "reused from checkpoint" });
      return cached;
    }
    emit({ type: "stage", stage, status: "started", note });
    const result = await fn((message) => emit({ type: "log", stage, message }));
    await checkpoint?.save(stage, result);
    emit({ type: "stage", stage, status: "done" });
    return result;
  };

  const app = await run("resolve", (log) => discover(query, profile.officialPages, profile.communityPages, log), query);
  if (app.notFound) throw new Error(`Could not find a product with a developer program matching "${query}".`);
  if (app.ambiguousWith.length > 0)
    emit({ type: "log", stage: "resolve", message: `"${query}" could also mean: ${app.ambiguousWith.join(", ")}` });
  emit({ type: "log", stage: "resolve", message: `${app.name} by ${app.provider}, toolkit ${app.toolkitSlug || "none"}` });

  // Plain code from here until extraction: no model calls, no cost.
  const [composio, attempt] = await Promise.all([
    run("composio", async (log) => {
      const c = await readComposio(app.toolkitSlug || null, app.name);
      log(`auth ${c.authSchemes.join(", ") || "unknown"}; Composio-managed OAuth ${c.managedLive === null ? "unknown" : c.managedLive ? "yes" : "no"}`);
      return c;
    }),
    run("attempt", async (log) => {
      const p = await probePortal(app.developerPortalUrl, app.provider);
      p.steps.forEach((s) => log(`${s.result}: ${s.note}`));
      return p;
    }),
  ]);

  const pages = await run("read", async (log) => {
    const { pages, failed } = await loadPages(
      [
        ...app.officialUrls.map((url) => ({ url, kind: "official" as const })),
        ...composio.pageUrls.map((url) => ({ url, kind: "composio" as const })),
        ...app.communityUrls.map((url) => ({ url, kind: "community" as const })),
      ],
      profile.charsPerPage,
    );
    pages.forEach((p) => log(`read ${p.kind}: ${p.title.slice(0, 80)}`));
    if (failed.length) log(`could not use ${failed.length} page(s): ${failed.join(", ")}`);
    return pages;
  });

  const extracted = await run("extract", (log) => extractFindings(pages, app.providerDomains, profile.model, log), `${pages.length} pages`);
  const findings = [...composio.findings, ...attempt.findings, ...extracted];

  const written = await run("write", (log) =>
    writeGuide({ app, composio, findings, attempt: attempt.steps, model: profile.model, effort: profile.writerEffort, log }),
  );
  const guide = assemble(app, composio, findings, attempt.steps, written, (m) => emit({ type: "log", stage: "write", message: m }));
  emit({ type: "done", guide });
  return guide;
}

function assemble(
  app: Discovery,
  composio: ComposioInfo,
  findings: Finding[],
  attempt: AttemptStep[],
  w: WriterOutput,
  log: (m: string) => void,
): Guide {
  const today = new Date().toISOString().slice(0, 10);
  const byId = new Map(findings.map((f) => [f.id, f]));
  const estimates = new Map(w.estimates.map((e) => [e.id, e]));
  const used: string[] = [];

  // Keep only ids that exist; the writer cannot cite anything we did not give it.
  const ids = (list: string[]) =>
    list.filter((id) => {
      const ok = byId.has(id) || estimates.has(id);
      if (!ok) log(`removed unknown claim reference ${id}`);
      else if (!used.includes(id)) used.push(id);
      return ok;
    });
  const dur = (d: WriterOutput["verdict"]["timeToTesting"]) => ({ ...d, min: Math.max(0, d.min), max: Math.max(0, d.max, d.min), claimIds: ids(d.claimIds) });
  const isUrl = (u: string) => /^https?:\/\/\S+$/.test(u);

  const draft = {
    slug: (app.toolkitSlug || app.name).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
    name: app.name,
    provider: app.provider,
    developerPortalUrl: isUrl(w.developerPortalUrl) ? w.developerPortalUrl : isUrl(app.developerPortalUrl) ? app.developerPortalUrl : undefined,
    generatedAt: today,
    pipelineVersion: config.pipelineVersion,
    authTypes: w.authTypes,
    composio: {
      toolkitSlug: composio.toolkitSlug,
      managedOAuth: composio.managedLive ?? composio.managedInDirectory,
      scopes: w.composioScopes,
    },
    needOwnApp: { ...w.needOwnApp, claimIds: ids(w.needOwnApp.claimIds) },
    verdict: {
      ...w.verdict,
      difficulty: Math.min(5, Math.max(1, Math.round(w.verdict.difficulty))) as 1 | 2 | 3 | 4 | 5,
      timeToTesting: dur(w.verdict.timeToTesting),
      timeToProduction: dur(w.verdict.timeToProduction),
    },
    stages: w.stages.map((s) => ({
      ...s,
      duration: dur(s.duration),
      steps: s.steps.map(({ humanReason, ...step }) => ({
        ...step,
        ...(humanReason ? { humanReason } : {}),
        links: step.links.filter((l) => isUrl(l.url)),
        claimIds: ids(step.claimIds),
      })),
    })),
    requirements: w.requirements.map((r) => ({ ...r, claimIds: ids(r.claimIds) })),
    blockers: w.blockers.map((b) => ({ ...b, claimIds: ids(b.claimIds) })),
    handoff: w.handoff,
    unknowns: w.unknowns.map(({ draftEmail, ...u }) => ({ ...u, ...(draftEmail ? { draftEmail } : {}) })),
    claims: [] as Claim[],
    attempt: attempt.length > 0 ? toAttempt(attempt, today) : undefined,
  };

  draft.claims = used.map((id): Claim => {
    const est = estimates.get(id);
    if (est) return { id, text: `Estimate: ${est.text}`, evidence: "unknown", sources: [] };
    const f = byId.get(id)!;
    return {
      id,
      text: f.text,
      evidence: f.evidence,
      sources: f.sources
        .filter((s) => isUrl(s.url))
        .map((s) => ({ url: s.url, title: s.title, quote: s.quote || undefined, publishedAt: s.publishedAt || undefined, accessedAt: today })),
      ...(f.evidence === "tested" ? { testedAt: today } : {}),
    };
  });
  // House style: no em dashes. Enforced here because models do not always follow the instruction.
  return Guide.parse(JSON.parse(JSON.stringify(draft).replace(/\s*\u2014\s*/g, ", ")));
}

function toAttempt(steps: AttemptStep[], today: string) {
  const blocked = steps.find((s) => s.result === "blocked");
  return {
    mode: "public" as const,
    ranAt: today,
    outcome: blocked ? ("stopped" as const) : ("completed" as const),
    ...(blocked ? { stoppedAt: blocked.note } : {}),
    log: steps.map((s) => ({ step: s.step, result: s.result, note: `${s.note} (${s.url})` })),
  };
}
