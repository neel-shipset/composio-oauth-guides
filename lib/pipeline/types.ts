import type { Guide } from "@/lib/schema";

// Progress events streamed to the browser during live generation.
export type PipelineEvent =
  | { type: "stage"; stage: StageName; status: "started" | "done" | "skipped"; note?: string }
  | { type: "log"; stage: StageName; message: string }
  | { type: "done"; guide: Guide }
  | { type: "error"; message: string };

// resolve: small model picks the app and the pages to read
// composio, read, attempt: plain code (toolkit page, page downloads, portal probe), no model
// extract: one model call pulls quoted facts from the pages; code checks each quote is on its page
// write: one model call writes the guide from the checked facts
export type StageName = "resolve" | "composio" | "read" | "attempt" | "extract" | "write";

export type Emit = (event: PipelineEvent) => void;

export const TOPICS = [
  "registration",
  "redirect",
  "scopes",
  "testing_limits",
  "distribution",
  "review",
  "requirements",
  "tokens",
  "rate_limits",
  "admin_controls",
  "costs",
  "composio",
  "gotchas",
] as const;

export type Finding = {
  id: string;
  origin: "docs" | "community" | "composio" | "attempt";
  topic: (typeof TOPICS)[number];
  text: string;
  evidence: "official" | "community" | "tested";
  sources: { url: string; title: string; quote: string; publishedAt: string }[];
};

export type AttemptStep = { step: string; result: "done" | "blocked" | "skipped"; note: string; url: string };
