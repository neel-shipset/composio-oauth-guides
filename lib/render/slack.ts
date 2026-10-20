import type { Guide } from "@/lib/schema";
import { DIFFICULTY, NEED_OWN_APP } from "./labels";

// Short summary for pasting into Slack (mrkdwn). Links back to the full guide.
export function toSlack(g: Guide, url: string): string {
  const d = DIFFICULTY[g.verdict.difficulty];
  return [
    `*${g.name} OAuth app: ${d.name} (${g.verdict.difficulty}/5)*`,
    g.verdict.summary,
    `• Testing: ${g.verdict.timeToTesting.label}`,
    `• Production: ${g.verdict.timeToProduction.label}`,
    `• Main blocker: ${g.verdict.mainBlocker}`,
    `• Own app needed? ${NEED_OWN_APP[g.needOwnApp.verdict]}`,
    `Full guide with steps and sources: <${url}|${g.name} guide>`,
  ].join("\n");
}
