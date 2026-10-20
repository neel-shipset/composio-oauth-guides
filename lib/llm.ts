import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z as zod, type z } from "zod";
import type { BetaRunnableTool } from "@anthropic-ai/sdk/lib/tools/BetaRunnableTool";
import { AsyncLocalStorage } from "node:async_hooks";
import { config } from "./config";

export const client = new Anthropic();

// Server-side refusal fallbacks: if the main model declines, the API reruns on a fallback model.
const BETAS = ["server-side-fallback-2026-07-01"];
const CONTEXT_BETA = "context-management-2025-06-27";

export const webSearch = (maxUses: number) => ({
  type: "web_search_20260209" as const,
  name: "web_search" as const,
  max_uses: maxUses,
});
// Haiku 4.5 only supports the basic web search variant.
export const webSearchBasic = (maxUses: number) => ({
  type: "web_search_20250305" as const,
  name: "web_search" as const,
  max_uses: maxUses,
});
export const webFetch = (maxUses: number, allowedDomains?: string[]) => ({
  type: "web_fetch_20260209" as const,
  name: "web_fetch" as const,
  max_uses: maxUses,
  max_content_tokens: 6000, // docs pages can be huge; cap what each fetch costs
  ...(allowedDomains ? { allowed_domains: allowedDomains } : {}),
});

type ServerTool = ReturnType<typeof webSearch> | ReturnType<typeof webSearchBasic> | ReturnType<typeof webFetch>;

// Haiku 4.5 rejects the effort parameter; fallbacks are only needed on the main model.
const isFast = (model: string) => model.startsWith("claude-haiku");
type RunnableTool = BetaRunnableTool;

// A recording tool: the agent calls it once per item it wants to report, and we collect
// the validated inputs. Keeps research output structured while the agent browses freely.
export function recorder<S extends z.ZodObject>(name: string, description: string, schema: S) {
  const items: z.infer<S>[] = [];
  const tool = betaZodTool({
    name,
    description,
    inputSchema: schema,
    run: async (input) => {
      items.push(input as z.infer<S>);
      return "recorded";
    },
  });
  return { tool, items };
}

export type AgentLog = (message: string) => void;

// Spend tracking is per run (AsyncLocalStorage), so concurrent live generations each get their
// own budget. Every agent call checks it; a run that hits its cap stops instead of running on.
// Note for scripts: import withBudget via "@/lib/pipeline", not "@/lib/llm". tsx loads .mts scripts
// as ESM and lib/ as CJS, so a direct import gets a second copy of this module whose budget the
// agents never see. (That bug let a $1.50 test run spend about $4.)
export type Usage = {
  input: number;
  output: number;
  cacheRead: number;
  searches: number;
  fetches: number;
  costUsd: number;
  capUsd: number;
  abort: AbortController; // cancels every in-flight call in the run once the cap is hit
};
const newUsage = (capUsd: number): Usage => ({ input: 0, output: 0, cacheRead: 0, searches: 0, fetches: 0, costUsd: 0, capUsd, abort: new AbortController() });
const runs = new AsyncLocalStorage<Usage>();
// Calls made outside withBudget get no budget at all: refuse rather than spend untracked.
export const currentUsage = () => {
  const u = runs.getStore();
  if (!u) throw new Error("Model call outside withBudget(): every run needs a spend cap");
  return u;
};
export function withBudget<T>(capUsd: number, fn: () => Promise<T>): { usage: Usage; result: Promise<T> } {
  const usage = newUsage(capUsd);
  return { usage, result: runs.run(usage, fn) };
}
export class BudgetExceeded extends Error {}
function checkBudget() {
  const u = currentUsage();
  if (u.costUsd >= u.capUsd) {
    u.abort.abort(); // stop the other agents' in-flight calls too, not just this one
    throw new BudgetExceeded(`Spend cap reached ($${u.costUsd.toFixed(2)} of $${u.capUsd.toFixed(2)})`);
  }
  if (u.abort.signal.aborted) throw new BudgetExceeded("Run stopped: spend cap reached");
}
const PRICE: Record<string, [number, number]> = {
  "claude-opus-5": [5, 25],
  "claude-sonnet-5": [2, 10],
  "claude-haiku-4-5": [1, 5],
};
function track(model: string, u: Anthropic.Beta.BetaUsage | undefined) {
  if (!u) return;
  const usage = currentUsage();
  const [inP, outP] = PRICE[model] ?? [5, 25];
  const input = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
  usage.input += input;
  usage.output += u.output_tokens ?? 0;
  usage.cacheRead += u.cache_read_input_tokens ?? 0;
  usage.searches += u.server_tool_use?.web_search_requests ?? 0;
  usage.fetches += u.server_tool_use?.web_fetch_requests ?? 0;
  usage.costUsd +=
    (input * inP + (u.cache_read_input_tokens ?? 0) * inP * 0.1 + (u.output_tokens ?? 0) * outP) / 1e6 +
    (u.server_tool_use?.web_search_requests ?? 0) * 0.01;
}

// Runs one agent to completion: tool runner + server tools, resuming pause_turn,
// and reporting each web search / fetch so the UI can show the agent working.
export async function runAgent(opts: {
  system: string;
  prompt: string;
  tools: RunnableTool[];
  serverTools: ServerTool[];
  model?: string;
  effort?: "low" | "medium" | "high" | "xhigh";
  maxIterations?: number;
  log?: AgentLog;
}) {
  checkBudget();
  const model = opts.model ?? config.modelMain;
  const runner = client.beta.messages.toolRunner({
    model,
    max_tokens: 32000,
    ...(isFast(model)
      ? { betas: [CONTEXT_BETA] }
      : { betas: [...BETAS, CONTEXT_BETA], fallbacks: "default" as const, output_config: { effort: opts.effort ?? "high" } }),
    // Without this every step re-sends every page already read, so cost grows with each page.
    // Findings are recorded as tool inputs (kept), so clearing old page text loses nothing.
    context_management: {
      edits: [
        {
          type: "clear_tool_uses_20250919",
          trigger: { type: "input_tokens", value: 30000 },
          keep: { type: "tool_uses", value: 3 },
          clear_at_least: { type: "input_tokens", value: 5000 },
        },
      ],
    },
    system: opts.system,
    tools: [...opts.tools, ...opts.serverTools],
    messages: [{ role: "user", content: opts.prompt }],
    max_iterations: opts.maxIterations ?? 40,
    stream: true,
  }, { signal: currentUsage().abort.signal });

  let last: Anthropic.Beta.BetaMessage | undefined;
  for await (const stream of runner) {
    // Report each search / page read as soon as its block completes, not when the turn ends.
    stream.on("contentBlock", (block) => {
      if (block.type !== "server_tool_use") return;
      const input = block.input as { query?: string; url?: string };
      if (input.query) opts.log?.(`searching: ${input.query}`);
      if (input.url) opts.log?.(`reading: ${input.url}`);
    });
    const message = await stream.finalMessage();
    last = message;
    track(model, message.usage);
    checkBudget();
    if (message.stop_reason === "pause_turn") {
      runner.pushMessages({ role: "assistant", content: message.content });
    }
  }
  if (last?.stop_reason === "refusal") throw new Error("Model declined the request");
  return last;
}

// One JSON response checked against a zod schema, streamed (long outputs would hit HTTP timeouts).
// Not using strict structured outputs: the guide schema is too large for the grammar compiler.
// Instead the schema goes in the prompt, the reply is validated, and validation errors are sent
// back once for a repair.
export async function generateJson<S extends z.ZodType>(opts: {
  system: string;
  prompt: string;
  schema: S;
  model?: string;
  effort?: "low" | "medium" | "high" | "xhigh";
  log?: AgentLog;
}): Promise<z.infer<S>> {
  const model = opts.model ?? config.modelMain;
  const jsonSchema = JSON.stringify(zod.toJSONSchema(opts.schema));
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: `${opts.prompt}\n\nReply with one JSON object only, no prose, matching this JSON Schema:\n${jsonSchema}` },
  ];
  for (let attempt = 0; attempt < 2; attempt++) {
    checkBudget();
    const stream = client.beta.messages.stream({
      model,
      max_tokens: 64000,
      betas: BETAS,
      fallbacks: "default",
      output_config: { effort: opts.effort ?? "high" },
      system: opts.system,
      messages,
    }, { signal: currentUsage().abort.signal });
    const message = await stream.finalMessage();
    track(model, message.usage);
    if (message.stop_reason === "refusal") throw new Error("Model declined the request");
    if (message.stop_reason === "max_tokens") throw new Error("JSON output was cut off at max_tokens");
    const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const body = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    let issues: string;
    try {
      const parsed = opts.schema.safeParse(JSON.parse(body));
      if (parsed.success) return parsed.data;
      issues = parsed.error.issues.slice(0, 30).map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    } catch (e) {
      issues = `Invalid JSON: ${e instanceof Error ? e.message : e}`;
    }
    opts.log?.(`output failed validation, asking for a repair`);
    messages.push(
      { role: "assistant", content: message.content.filter((b) => b.type === "text") },
      { role: "user", content: `That JSON does not match the schema:\n${issues}\nReply with the corrected full JSON object only.` },
    );
  }
  throw new Error("Model output did not match the schema after a repair attempt");
}
