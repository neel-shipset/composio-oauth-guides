import type { Guide } from "@/lib/schema";
import { ACTOR, DIFFICULTY, EVIDENCE, NEED_OWN_APP } from "./labels";

// Full guide as Markdown, for "Copy as Markdown" and the .md download.
export function toMarkdown(g: Guide, url?: string): string {
  const claims = new Map(g.claims.map((c, i) => [c.id, i + 1]));
  const refs = (ids: string[]) => (ids.length ? " " + ids.map((id) => `[${claims.get(id)}]`).join("") : "");
  const d = DIFFICULTY[g.verdict.difficulty];
  const out: string[] = [];

  out.push(`# ${g.name} OAuth app: setup and approval guide`, "");
  out.push(`**Difficulty ${g.verdict.difficulty}/5, ${d.name}** · Confidence: ${g.verdict.confidence} · Provider: ${g.provider}`, "");
  out.push(g.verdict.summary, "");
  out.push(`| Time to testing | Time to production | Main blocker |`, `|---|---|---|`);
  out.push(`| ${g.verdict.timeToTesting.label} | ${g.verdict.timeToProduction.label} | ${g.verdict.mainBlocker} |`, "");
  out.push(`**Do you need your own OAuth app?** ${NEED_OWN_APP[g.needOwnApp.verdict]}${refs(g.needOwnApp.claimIds)}`);
  for (const r of g.needOwnApp.reasons) out.push(`- ${r}`);
  out.push("");

  g.stages.forEach((s, i) => {
    out.push(`## Stage ${i + 1}: ${s.name} (${s.duration.label})`, "");
    if (s.limits.length) out.push(...s.limits.map((l) => `> ${l}`), "");
    s.steps.forEach((st, j) => {
      out.push(`${j + 1}. **${st.title}** _(${ACTOR[st.actor]})_${refs(st.claimIds)}  `, `   ${st.detail}`);
      if (st.humanReason) out.push(`   _Why you: ${st.humanReason}_`);
      for (const v of st.preparedValues) out.push(`   - ${v.label}: \`${v.value}\``);
      for (const l of st.links) out.push(`   - [${l.label}](${l.url})`);
    });
    out.push("");
  });

  if (g.requirements.length) {
    out.push(`## Requirements`, "");
    for (const r of g.requirements) out.push(`- **${r.title}**: ${r.detail}${refs(r.claimIds)}`);
    out.push("");
  }
  if (g.blockers.length) {
    out.push(`## If you get stuck`, "");
    for (const b of g.blockers) out.push(`- **${b.title}.** You see: ${b.symptom} Fix: ${b.fix}${refs(b.claimIds)}`);
    out.push("");
  }
  out.push(`## What an agent can do, and what you must do`, "");
  out.push(`**Agent can:**`, ...g.handoff.agentCan.map((x) => `- ${x}`), "", `**You must:**`, ...g.handoff.youMust.map((x) => `- ${x}`), "");
  if (g.unknowns.length) {
    out.push(`## Not yet known`, "");
    for (const u of g.unknowns) out.push(`- **${u.question}** ${u.whyItMatters} Ask: ${u.askWhom}.`);
    out.push("");
  }
  out.push(`## Sources`, "");
  g.claims.forEach((c, i) => {
    const e = EVIDENCE[c.evidence];
    const src = c.sources.map((s) => `[${s.title}](${s.url})${s.publishedAt ? ` (${s.publishedAt})` : ""}`).join("; ");
    out.push(`${i + 1}. ${e.mark} ${e.label}: ${c.text}${src ? ` ${src}` : ""}`);
  });
  out.push("", `_Generated ${g.generatedAt}${url ? ` · ${url}` : ""}_`);
  return out.join("\n");
}
