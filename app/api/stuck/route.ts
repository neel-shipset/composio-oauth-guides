import { config } from "@/lib/config";
import { runAgent, webSearch, withBudget } from "@/lib/llm";
import { getGuide } from "@/lib/store";
import { allowed, clientIp } from "@/lib/ratelimit";

export const maxDuration = 120;

const SYSTEM = `You help a developer who is stuck while setting up an OAuth app with a provider so their AI agent (built on Composio) can connect users' accounts.
You get the full setup guide, the step they are on, and what they see. Diagnose the most likely cause and give the fix as short numbered steps.
Prefer the guide's own blockers and facts. If you need more, search the web briefly and cite the page. If you are not sure, say what to check.
Never ask for or repeat secrets (client secrets, tokens). If the message contains one, tell them to rotate it.
Plain text, under 150 words.`;

export async function POST(request: Request) {
  const { slug, step, problem } = (await request.json().catch(() => ({}))) as { slug?: string; step?: string; problem?: string };
  if (!slug || !problem?.trim()) return Response.json({ error: "Describe what you see." }, { status: 400 });
  // Each answer spends API credit (capped at $0.25), so limit questions per visitor.
  if (!allowed(`stuck:${clientIp(request)}`, 20)) return Response.json({ error: "Too many questions this hour. Try again later." }, { status: 429 });
  const found = await getGuide(slug);
  if (!found) return Response.json({ error: "Guide not found." }, { status: 404 });

  const message = await withBudget(0.25, () => runAgent({
    system: SYSTEM,
    prompt: `Guide:\n${JSON.stringify(found.guide)}\n\nStep: ${step}\n\nWhat I see:\n${problem.slice(0, 2000)}`,
    tools: [],
    serverTools: [webSearch(3)],
    model: config.modelLive,
    effort: "medium",
    maxIterations: 4,
  })).result;
  const answer = message?.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
  return Response.json({ answer: answer || "No answer. Try describing the error message exactly." });
}
