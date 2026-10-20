// Run the pipeline from the command line:
//   npm run generate -- jira            (thorough: for the library)
//   npm run generate -- jira --live     (live profile: what the website runs)
//   npm run generate -- jira --reuse --redo=write   (keep research, rerun the writer)
//   --max-cost=3   hard spend cap for this run in USD (defaults: live $1, thorough $3)
//   npm run generate -- "https://developer.atlassian.com"
// Output goes to data/generated/<slug>.json with a run log next to it. Promote a guide to the
// library (data/guides/) only after checking it.
import fs from "node:fs/promises";
import { generateGuide, withBudget, type Checkpoint } from "@/lib/pipeline";
import { PROFILES } from "@/lib/pipeline/profile";
import type { PipelineEvent } from "@/lib/pipeline/types";

const args = process.argv.slice(2);
const profile = args.includes("--live") ? PROFILES.live : PROFILES.thorough;
const query = args.filter((a) => !a.startsWith("--")).join(" ").trim();
const cap = Number(args.find((a) => a.startsWith("--max-cost="))?.slice(11) ?? profile.capUsd);
if (!query) {
  console.error("Usage: npm run generate -- <app name or URL>");
  process.exit(1);
}

// --reuse: load finished stages from the last run of this query and only run what is missing.
// --redo=<stage>[,<stage>]: rerun those stages even when cached (e.g. --redo=write after a prompt change).
const reuse = args.includes("--reuse");
const redo = (args.find((a) => a.startsWith("--redo="))?.slice(7).split(",") ?? []).filter(Boolean);
const cacheDir = `data/generated/.cache/${query.toLowerCase().replace(/[^a-z0-9]+/g, "_")}-${profile.name}`;
await fs.mkdir(cacheDir, { recursive: true });
const checkpoint: Checkpoint = {
  async load(stage) {
    if (!reuse || redo.includes(stage)) return undefined;
    try {
      return JSON.parse(await fs.readFile(`${cacheDir}/${stage}.json`, "utf8"));
    } catch {
      return undefined;
    }
  },
  async save(stage, data) {
    await fs.writeFile(`${cacheDir}/${stage}.json`, JSON.stringify(data, null, 1));
  },
};

const started = Date.now();
const events: (PipelineEvent & { t: number })[] = [];
const elapsed = () => `${((Date.now() - started) / 1000).toFixed(0)}s`;

const { usage, result } = withBudget(cap, () => generateGuide(query, (e) => {
  if (e.type !== "done") events.push({ ...e, t: Date.now() - started });
  if (e.type === "stage") console.log(`${elapsed()} [${e.stage}] ${e.status}${e.note ? `: ${e.note}` : ""}`);
  if (e.type === "log") console.log(`${elapsed()}   ${e.stage}: ${e.message}`);
  if (e.type === "error") console.error(`ERROR: ${e.message}`);
}, profile, checkpoint));
const guide = await result.catch((e) => {
  console.error(`\nFAILED after ${elapsed()}: ${e instanceof Error ? e.message : e}`);
  console.error(`Cost so far ~$${usage.costUsd.toFixed(2)}. Rerun with --reuse to keep finished stages.`);
  process.exit(1);
});

const out = `data/generated/${guide.slug}.json`;
await fs.writeFile(out, JSON.stringify(guide, null, 2) + "\n");
await fs.writeFile(
  `data/generated/${guide.slug}.run.json`,
  JSON.stringify({ query, profile: profile.name, seconds: (Date.now() - started) / 1000, usage: { ...usage, abort: undefined }, events }, null, 2) + "\n",
);
console.log(`\nSaved ${out} in ${elapsed()}. Cost ~$${usage.costUsd.toFixed(2)} (${usage.searches} searches, ${usage.fetches} fetches)`);
