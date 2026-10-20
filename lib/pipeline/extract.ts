// Step 3 (one model call): read the fetched pages and extract findings, each with an exact quote.
// Step 4 (code, no model): keep a finding only if its quote really appears on that page, and set
// its evidence label from what kind of page it came from. The model never labels its own evidence.
import { z } from "zod";
import { generateJson, type AgentLog } from "@/lib/llm";
import { normalise, type Page } from "./pages";
import { TOPICS, type Finding } from "./types";

const Extracted = z.object({
  findings: z.array(
    z.object({
      page: z.string().describe("Page id the finding comes from, e.g. P3"),
      topic: z.enum(TOPICS),
      text: z.string().describe("One self-contained factual statement, specific enough to act on"),
      quote: z.string().describe("Exact sentence copied from that page that supports the statement"),
      byProviderStaff: z.boolean().describe("For forum pages: true if the quoted post is by the provider's staff. Else false."),
    }),
  ),
});

const SYSTEM = `You extract facts for a guide on registering an OAuth app with a provider and getting it approved, for a developer whose AI agent (built on Composio) connects users' accounts.
You are given excerpts of pages. Extract every useful fact on these topics:
registration (where and how the app is created; is there an API for it; prerequisites), redirect (callback rules), scopes (sensitive/restricted scopes, caps), testing_limits (what works before going public), distribution (what is needed before outside users can connect), review (required or optional, what is checked, published timelines, real reported wait times with dates), requirements (privacy policy, domain, business verification, security assessment), tokens (lifetimes, refresh, rotation), rate_limits (especially quotas shared by all users of one app), admin_controls (org admins blocking or approving apps), costs, composio (what Composio's pages say about this toolkit), gotchas (common errors and fixes).
Rules:
- quote must be copied exactly from the page excerpt, one or two sentences. If you cannot quote it, leave the fact out.
- One fact per finding. Do not merge facts from different pages.
- Facts from forum or blog pages are reports, not rules: write them as "Developers report..." and include the date if the page shows one.
- Ignore content about other products from the same company unless it clearly applies.
- Aim for 15-35 findings across the pages.`;

export async function extractFindings(pages: Page[], providerDomains: string[], model: string, log: AgentLog): Promise<Finding[]> {
  if (pages.length === 0) return [];
  const prompt = pages
    .map((p) => `=== ${p.id} (${p.kind}${p.publishedAt ? `, dated ${p.publishedAt}` : ""}) ${p.title}\nURL: ${p.finalUrl}\n${p.excerpt}`)
    .join("\n\n");
  const out = await generateJson({ system: SYSTEM, prompt, schema: Extracted, model, effort: "medium", log });

  const byId = new Map(pages.map((p) => [p.id, p]));
  const findings: Finding[] = [];
  let unquoted = 0;
  for (const f of out.findings) {
    const page = byId.get(f.page);
    const q = normalise(f.quote);
    // Code-level check: the quote must really be on the page. Catches invented or paraphrased quotes.
    if (!page || q.length < 20 || !normalise(page.fullText).includes(q)) {
      unquoted++;
      continue;
    }
    findings.push({
      id: `f${findings.length + 1}`,
      origin: page.kind === "community" ? "community" : page.kind === "composio" ? "composio" : "docs",
      topic: f.topic,
      text: f.text,
      evidence: evidenceFor(page, providerDomains, f.byProviderStaff),
      sources: [{ url: page.finalUrl, title: page.title, quote: f.quote, publishedAt: page.publishedAt ?? "" }],
    });
  }
  log(`${findings.length} findings kept; ${unquoted} dropped because their quote was not on the page`);
  return findings;
}

// Evidence comes from the source, not the model: provider docs and Composio's own pages are
// official; forums count as official only for posts by provider staff; everything else is community.
function evidenceFor(page: Page, providerDomains: string[], byStaff: boolean): Finding["evidence"] {
  if (page.kind === "composio") return "official";
  const host = new URL(page.finalUrl).hostname.replace(/^www\./, "");
  const isProvider = providerDomains.some((d) => host === d || host.endsWith(`.${d}`));
  const isForum = /^(community|forum|forums|devforum|discuss|discussions)\./.test(host) || /\/t\/|\/questions\/|\/discussions\//.test(page.finalUrl);
  if (isProvider && !isForum) return "official";
  if (isProvider && isForum && byStaff) return "official";
  return "community";
}
