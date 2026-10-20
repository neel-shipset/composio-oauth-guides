// Grades a generated guide against a hand-checked fact list.
//   npm run eval -- data/generated/jira.json data/eval/jira.json
import fs from "node:fs/promises";
import { z } from "zod";
import { generateJson, withBudget } from "@/lib/llm";

const [guidePath, evalPath] = process.argv.slice(2);
const guide = JSON.parse(await fs.readFile(guidePath, "utf8"));
const spec = JSON.parse(await fs.readFile(evalPath, "utf8"));

const Grade = z.object({
  mustHave: z.array(z.object({ fact: z.string(), grade: z.enum(["present", "partial", "absent", "contradicted"]), where: z.string() })),
  mustNotSay: z.array(z.object({ rule: z.string(), violated: z.boolean(), where: z.string() })),
  otherErrors: z.array(z.string()).describe("Statements in the guide that look factually wrong or unsupported by its own claims"),
  usefulness: z.array(z.string()).describe("Concrete weaknesses that would make the guide less useful to a developer"),
});

const { usage, result: graded } = withBudget(0.5, () => generateJson({
  system:
    "You grade developer setup guides against a reference fact list. Be strict: 'present' only if the guide states the fact clearly; 'partial' if it is vague or incomplete; 'contradicted' if it says something incompatible.",
  prompt: `Reference facts:\n${JSON.stringify(spec.mustHave, null, 1)}\n\nThe guide must not say:\n${JSON.stringify(spec.mustNotSay, null, 1)}\n\nGuide:\n${JSON.stringify(guide)}`,
  schema: Grade,
  effort: "medium",
}));
const result = await graded;

const points = { present: 1, partial: 0.5, absent: 0, contradicted: -1 } as const;
const score = result.mustHave.reduce((s, g) => s + points[g.grade], 0);
const violations = result.mustNotSay.filter((v) => v.violated);
console.log(`Difficulty: got ${guide.verdict.difficulty}, expected ${spec.expectedDifficulty}`);
console.log(`Facts: ${score}/${spec.mustHave.length}`);
for (const g of result.mustHave) if (g.grade !== "present") console.log(`  [${g.grade}] ${g.fact}`);
console.log(`Must-not-say violations: ${violations.length}`);
for (const v of violations) console.log(`  ${v.rule} -> ${v.where}`);
console.log("Other errors:", result.otherErrors);
console.log("Usefulness:", result.usefulness);
console.log(`(judge cost ~$${usage.costUsd.toFixed(2)})`);
await fs.writeFile(guidePath.replace(/\.json$/, ".eval.json"), JSON.stringify({ score, of: spec.mustHave.length, ...result }, null, 2) + "\n");
