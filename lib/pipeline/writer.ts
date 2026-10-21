// Turns verified findings into a Guide, scoring difficulty with the rubric.
// The writer can only cite finding ids it was given, plus estimates it must label as such,
// so it cannot invent sources.
import { z } from "zod";
import { generateJson, type AgentLog } from "@/lib/llm";
import { RUBRIC } from "@/lib/rubric";
import jiraGold from "@/data/guides/jira.json";
import type { ComposioInfo } from "./composio-page";
import type { AttemptStep, Finding } from "./types";

const Ids = z.array(z.string()).describe("Finding ids (d1, m3, k2, a1...) or estimate ids (e1...) that support this");
const Duration = z.object({
  min: z.number(),
  max: z.number(),
  unit: z.enum(["minutes", "hours", "days", "weeks", "months"]),
  label: z.string().describe("Short human label, e.g. '20-45 min', '2-6 weeks', 'Unknown: no published timeline'"),
  claimIds: Ids,
});
const Step = z.object({
  title: z.string(),
  detail: z.string(),
  actor: z.enum(["agent", "human", "either"]),
  humanReason: z.string().describe("Why a person must do it (sign-in, payment, legal declaration); empty if actor is agent"),
  links: z.array(z.object({ label: z.string(), url: z.string() })),
  preparedValues: z.array(z.object({ label: z.string(), value: z.string() })),
  claimIds: Ids,
});

export const WriterOutput = z.object({
  composioScopes: z.array(z.string()).describe("Scopes the Composio toolkit requests, taken from the composio findings; empty if unknown"),
  authTypes: z.array(z.enum(["oauth2", "oauth1", "api_key", "basic", "bearer", "other"])),
  developerPortalUrl: z.string(),
  needOwnApp: z.object({
    verdict: z.enum(["required", "recommended_for_production", "not_needed", "no_oauth"]),
    reasons: z.array(z.string()),
    claimIds: Ids,
  }),
  verdict: z.object({
    difficulty: z.number().int().describe("1-5 per the rubric"),
    summary: z.string(),
    timeToTesting: Duration,
    timeToProduction: Duration,
    mainBlocker: z.string(),
    confidence: z.enum(["high", "medium", "low"]),
  }),
  stages: z.array(z.object({ name: z.string(), duration: Duration, limits: z.array(z.string()), steps: z.array(Step) })),
  requirements: z.array(z.object({ title: z.string(), detail: z.string(), claimIds: Ids })),
  blockers: z.array(z.object({ title: z.string(), symptom: z.string(), fix: z.string(), claimIds: Ids })),
  handoff: z.object({ agentCan: z.array(z.string()), youMust: z.array(z.string()) }),
  unknowns: z.array(
    z.object({ question: z.string(), whyItMatters: z.string(), askWhom: z.string(), draftEmail: z.string() }),
  ),
  estimates: z
    .array(z.object({ id: z.string().describe("e1, e2..."), text: z.string().describe("The estimate and what it is based on") }))
    .describe("Your own estimates (e.g. setup minutes) that no finding states. They are shown as unverified."),
});
export type WriterOutput = z.infer<typeof WriterOutput>;

const SYSTEM = `You write OAuth app setup guides for developers building AI agents on Composio. The reader is a developer deciding whether they can launch an integration in time, and then following the steps.

Write the guide only from the verified findings provided. Rules:
- Every factual sentence must be backed by claimIds pointing at findings. If something matters but no finding supports it, put it in unknowns, not in the guide.
- Durations you estimate yourself (e.g. minutes of console work) go in estimates and are referenced by their e-id. Never present an estimate as fact.
- Community findings are reported experiences: phrase them that way ("developers report..."), with dates.
- Findings dated more than two years ago that describe a process or timeline may be outdated: they must not drive the verdict; mention them only as history.
- Every finding's quote has been checked by code against its page, so findings are reliable, but they only cover what the pages said. Anything else important goes in unknowns.
- Lead with what decides the plan: the verdict summary must say how long until outside users can connect and what can block it, in two or three short sentences and at most 60 words. Details belong in the sections below, not in the summary.
- needOwnApp: "required" if Composio has no managed OAuth for this toolkit; "recommended_for_production" if it does (give the concrete reasons: branding, shared quotas, scopes); "not_needed" only if the provider offers dynamic client registration or equivalent; "no_oauth" if the toolkit does not use OAuth. If Composio sources conflict about managed status, say so in reasons and add an unknown.
- Steps: each step is one action in the provider's console or Composio. actor "human" when it needs the developer's sign-in, payment or a legal declaration; "agent" when an AI agent can do it with no provider sign-in; "either" when either works. Put copy-paste values in preparedValues. Never hard-code Composio's redirect URI: tell the developer to copy it from their Composio auth config.
- Blockers: what the developer sees (symptom) and the fix.
- Unknowns: each with who to ask and a short, ready-to-send email.
- If the toolkit page and the directory disagree on managed status, trust the toolkit page and mention the conflict.
- Write plainly. No marketing language. No em dashes.

${RUBRIC}`;

export async function writeGuide(input: {
  app: { name: string; provider: string; developerPortalUrl: string; toolkitSlug: string };
  composio: ComposioInfo;
  findings: Finding[];
  attempt: AttemptStep[];
  model: string;
  effort: "medium" | "high";
  log: AgentLog;
}): Promise<WriterOutput> {
  const isJira = input.app.toolkitSlug === "JIRA";
  const prompt = [
    `App: ${input.app.name} (provider: ${input.app.provider})`,
    `Developer portal: ${input.app.developerPortalUrl || "unknown"}`,
    `Composio toolkit: ${input.composio.toolkitSlug ?? "none"}`,
    `Composio managed OAuth: directory page says ${fmt(input.composio.managedInDirectory)}; toolkit page says ${fmt(input.composio.managedLive)}`,
    `Composio auth schemes for this toolkit: ${input.composio.authSchemes.join(", ") || "unknown"}${input.composio.authSchemes.includes("DCR_OAUTH") ? " (DCR_OAUTH: the client registers itself with the server, so the developer does not create an OAuth app; needOwnApp is not_needed unless findings say otherwise)" : ""}`,
    `Setup attempt (our code opened the registration page without signing in):\n${JSON.stringify(input.attempt, null, 1)}`,
    `Verified findings:\n${JSON.stringify(
      input.findings.map((f) => ({
        id: f.id,
        topic: f.topic,
        evidence: f.evidence,
        text: f.text,
        dates: f.sources.map((s) => s.publishedAt).filter(Boolean),
        sources: f.sources.map((s) => s.title),
      })),
      null,
      1,
    )}`,
    // A worked example for format, depth and tone. Not used when writing Jira itself,
    // so the Jira run is a fair comparison against the hand-written guide.
    isJira ? "" : `Example of a finished guide for a different app (format and depth only; its facts do not apply):\n${JSON.stringify(stripClaims(jiraGold))}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return generateJson({ system: SYSTEM, prompt, schema: WriterOutput, model: input.model, effort: input.effort, log: input.log });
}

const fmt = (b: boolean | null) => (b === null ? "unknown" : b ? "managed" : "not managed");
function stripClaims(g: typeof jiraGold) {
  return { ...g, claims: undefined };
}
