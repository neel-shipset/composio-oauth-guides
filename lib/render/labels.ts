import type { Guide } from "@/lib/schema";

export const DIFFICULTY: Record<number, { name: string; blurb: string }> = {
  1: { name: "Instant", blurb: "Self-serve, no review" },
  2: { name: "Self-serve with caveats", blurb: "No review needed to go live, extra steps first" },
  3: { name: "Reviewed", blurb: "A human at the provider reviews public apps" },
  4: { name: "Heavy verification", blurb: "Brand or security verification, weeks" },
  5: { name: "Gated", blurb: "Partner program or paid tier, may never be granted" },
};

export const NEED_OWN_APP: Record<Guide["needOwnApp"]["verdict"], string> = {
  required: "Required: Composio has no managed OAuth app for this toolkit",
  recommended_for_production: "Recommended for production",
  not_needed: "Probably not needed",
  no_oauth: "Not applicable: this toolkit does not use OAuth",
};

export const EVIDENCE: Record<string, { label: string; mark: string }> = {
  tested: { label: "Tested", mark: "🟢" },
  official: { label: "Official docs", mark: "🔵" },
  community: { label: "Community report", mark: "🟡" },
  unknown: { label: "Unverified", mark: "⚪" },
};

export const ACTOR: Record<string, string> = { agent: "Agent can do", human: "You do", either: "Agent or you" };
