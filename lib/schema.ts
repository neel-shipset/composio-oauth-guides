import { z } from "zod";

// One guide = one Composio toolkit (not one company): LinkedIn and LinkedIn Ads
// have different gates, so they get different guides.

// Every factual statement in a guide points at a claim, and every claim carries
// its evidence level. The verifier downgrades anything it cannot back up.
export const Evidence = z.enum([
  "tested", // we (or our agent) did it, with a timestamp and a log
  "official", // stated in the provider's own docs, linked
  "community", // forums, GitHub issues, Reddit: linked, flagged as reported
  "unknown", // could not establish; the guide says so
]);

export const Source = z.object({
  url: z.string().url(),
  title: z.string(),
  quote: z.string().optional(), // the exact sentence the claim rests on
  publishedAt: z.string().optional(), // when the source was written, for staleness checks
  accessedAt: z.string(), // ISO date
});

export const Claim = z.object({
  id: z.string(), // "c1", "c2", ... referenced from the sections below
  text: z.string(),
  evidence: Evidence,
  sources: z.array(Source),
  testedAt: z.string().optional(),
});

// Durations as ranges, because "2-6 weeks" is the honest answer for most reviews.
export const Duration = z.object({
  min: z.number().nonnegative(),
  max: z.number().nonnegative(),
  unit: z.enum(["minutes", "hours", "days", "weeks", "months"]),
  label: z.string(), // "30 min", "2-6 weeks", "unknown: no published SLA"
  claimIds: z.array(z.string()),
});

// See docs/rubric.md for the definition of each level.
export const Difficulty = z.union([
  z.literal(1), // Instant: self-serve, no review
  z.literal(2), // Self-serve with caveats: no review, but distribution/setup quirks
  z.literal(3), // Reviewed: a human reviews public apps; days
  z.literal(4), // Heavy verification: brand/security verification; weeks, maybe paid audit
  z.literal(5), // Gated: partner program, business verification or paid tier; may never be granted
]);

export const NeedOwnApp = z.object({
  verdict: z.enum([
    "required", // no Composio-managed OAuth for this toolkit
    "recommended_for_production", // managed works for testing; own app for branding/scopes/limits
    "not_needed", // e.g. MCP server with dynamic client registration
    "no_oauth", // toolkit uses API key / basic auth only
  ]),
  reasons: z.array(z.string()),
  claimIds: z.array(z.string()),
});

export const Step = z.object({
  title: z.string(),
  detail: z.string(),
  actor: z.enum(["agent", "human", "either"]),
  humanReason: z.string().optional(), // why a person must do it: login, payment, legal declaration
  links: z.array(z.object({ label: z.string(), url: z.string().url() })),
  preparedValues: z.array(z.object({ label: z.string(), value: z.string() })), // copy-paste fields
  claimIds: z.array(z.string()),
});

export const Stage = z.object({
  name: z.string(), // "Register the app", "Testing mode", "Production approval"
  duration: Duration,
  limits: z.array(z.string()), // e.g. "100 test users", "refresh tokens expire after 7 days"
  steps: z.array(Step),
});

export const Blocker = z.object({
  title: z.string(),
  symptom: z.string(), // what the developer sees: an error, a rejection email, a missing button
  fix: z.string(),
  claimIds: z.array(z.string()),
});

export const Unknown = z.object({
  question: z.string(),
  whyItMatters: z.string(),
  askWhom: z.string(), // "Atlassian developer support", "partner team"
  draftEmail: z.string().optional(),
});

export const AttemptLogEntry = z.object({
  step: z.string(),
  result: z.enum(["done", "blocked", "skipped"]),
  note: z.string(),
  screenshot: z.string().optional(), // path under data/attempts/
});

export const Attempt = z.object({
  mode: z.enum(["full", "public"]), // full = with a test account; public = pre-login pages only
  ranAt: z.string(),
  outcome: z.enum(["completed", "stopped", "failed"]),
  stoppedAt: z.string().optional(), // "Sign-in required", "Business verification", ...
  log: z.array(AttemptLogEntry),
});

export const Guide = z.object({
  slug: z.string(), // Composio toolkit slug, lowercased: "jira", "linkedin_ads"
  name: z.string(),
  provider: z.string(), // "Atlassian"
  developerPortalUrl: z.string().url().optional(),
  generatedAt: z.string(),
  pipelineVersion: z.string(),

  authTypes: z.array(z.enum(["oauth2", "oauth1", "api_key", "basic", "bearer", "other"])),
  composio: z.object({
    toolkitSlug: z.string().nullable(), // null when Composio has no toolkit for this app
    managedOAuth: z.boolean().nullable(), // null when unknown
    scopes: z.array(z.string()), // scopes the Composio toolkit requests
    redirectUri: z.string().optional(),
  }),
  needOwnApp: NeedOwnApp,

  verdict: z.object({
    difficulty: Difficulty,
    summary: z.string(), // one or two sentences a developer can act on
    timeToTesting: Duration,
    timeToProduction: Duration,
    mainBlocker: z.string(),
    confidence: z.enum(["high", "medium", "low"]),
  }),

  stages: z.array(Stage),
  requirements: z.array(z.object({ title: z.string(), detail: z.string(), claimIds: z.array(z.string()) })),
  blockers: z.array(Blocker),
  handoff: z.object({ agentCan: z.array(z.string()), youMust: z.array(z.string()) }),
  unknowns: z.array(Unknown),
  claims: z.array(Claim),
  attempt: Attempt.optional(),
});

export type Guide = z.infer<typeof Guide>;
export type Claim = z.infer<typeof Claim>;
export type Evidence = z.infer<typeof Evidence>;
