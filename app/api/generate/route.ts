import { config } from "@/lib/config";
import { withBudget } from "@/lib/llm";
import { generateGuide } from "@/lib/pipeline";
import { PROFILES } from "@/lib/pipeline/profile";
import type { PipelineEvent } from "@/lib/pipeline/types";
import { getGuide, saveLiveGuide } from "@/lib/store";
import { findToolkit } from "@/lib/toolkits";
import { allowed, clientIp } from "@/lib/ratelimit";

export const maxDuration = 300; // seconds: Vercel Hobby maximum; a live run takes about 2-3 minutes

// Live generation. Streams pipeline events as Server-Sent Events, then saves the guide for sharing.
export async function POST(request: Request) {
  const { query } = (await request.json().catch(() => ({}))) as { query?: string };
  const q = query?.trim().slice(0, 200);
  if (!q) return Response.json({ error: "Enter an app name or website." }, { status: 400 });

  const encoder = new TextEncoder();
  const sse = (e: PipelineEvent) => encoder.encode(`data: ${JSON.stringify(e)}\n\n`);

  // Already have it? Skip the agents.
  const known = findToolkit(q);
  const cached = known ? await getGuide(known.slug.toLowerCase()) : null;
  if (cached) return new Response(sse({ type: "done", guide: cached.guide }), { headers: { "Content-Type": "text/event-stream" } });

  if (!allowed(`generate:${clientIp(request)}`, config.rateLimitPerIpPerHour)) return Response.json({ error: "Rate limit reached. Try again in an hour." }, { status: 429 });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: PipelineEvent) => controller.enqueue(sse(e));
      try {
        // Hold back "done" until the guide is saved, so the redirect never lands on a missing page.
        const guide = await withBudget(PROFILES.live.capUsd, () => generateGuide(q, (e) => e.type !== "done" && send(e), PROFILES.live)).result;
        await saveLiveGuide(guide);
        send({ type: "done", guide });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform" },
  });
}
