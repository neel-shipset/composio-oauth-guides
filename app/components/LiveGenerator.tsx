"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { PipelineEvent, StageName } from "@/lib/pipeline/types";

const STAGES: { id: StageName; label: string; detail: string }[] = [
  { id: "resolve", label: "Identify the app", detail: "Small model matches the name to a product and picks the pages to read" },
  { id: "composio", label: "Check Composio", detail: "Read the toolkit page: auth type and whether Composio manages the OAuth app" },
  { id: "attempt", label: "Try the setup", detail: "Open the app registration page without signing in and record where it stops" },
  { id: "read", label: "Read the sources", detail: "Download official docs, Composio pages and developer reports; keep the relevant parts" },
  { id: "extract", label: "Extract and check facts", detail: "Pull quoted facts from the pages; code drops any quote not found on its page" },
  { id: "write", label: "Write the guide", detail: "Score difficulty, timeline, steps, blockers and unknowns from the checked facts" },
];

type Status = "waiting" | "started" | "done" | "skipped";

// Turn pipeline and API errors into something a visitor can act on.
function friendly(message: string): string {
  if (/spend cap|run stopped/i.test(message)) return "This run reached its spending cap before the guide was finished. Try again, or open a library guide.";
  if (/usage limit|credit balance|rate.?limit|429|overloaded|529/i.test(message)) return "The research service is busy or out of quota right now. Please try again in a little while, or open a library guide.";
  if (/could not find a product/i.test(message)) return message;
  if (/did not match the schema|cut off/i.test(message)) return "The writer could not produce a valid guide this time. Please try again.";
  return `Something went wrong: ${message}`;
}

export function LiveGenerator({ query }: { query: string }) {
  const router = useRouter();
  // Show the first step as running straight away, before the server's first event arrives.
  const [status, setStatus] = useState<Record<string, Status>>({ resolve: "started" });
  const [logs, setLogs] = useState<Record<string, string[]>>({ resolve: ["Connecting…"] });
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (error) return; // stop counting once the run has stopped
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [error]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok || !res.body) {
        setError(friendly((await res.json().catch(() => ({ error: res.statusText }))).error ?? res.statusText));
        return;
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      let finished = false;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const e = JSON.parse(part.slice(6)) as PipelineEvent;
          if (e.type === "stage") setStatus((s) => ({ ...s, [e.stage]: e.status }));
          if (e.type === "log") setLogs((l) => ({ ...l, [e.stage]: [...(l[e.stage] ?? []), e.message] }));
          if (e.type === "error") {
            finished = true;
            setError(friendly(e.message));
          }
          if (e.type === "done") {
            finished = true;
            router.replace(`/guide/${e.guide.slug}`);
          }
        }
      }
      // The hosting platform ends requests after five minutes; never leave the page spinning.
      if (!finished) setError("The research took too long and was stopped. Please try again; it usually finishes in two to three minutes.");
    })().catch((e) => setError(friendly(String(e))));
  }, [query, router]);

  return (
    <div className="mt-8 space-y-3">
      <p className="text-sm text-muted">
        {error ? "Stopped." : `Working… ${seconds}s (usually two to three minutes).`} Only two steps use a large model; the rest is plain code.
      </p>
      {STAGES.map((s) => {
        const st = status[s.id] ?? "waiting";
        const lines = logs[s.id] ?? [];
        return (
          <div key={s.id} className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center gap-3">
              <span className="w-5 text-center">
                {st === "done" ? "✓" : st === "skipped" ? "–" : st === "started" ? <Spinner /> : "·"}
              </span>
              <div className="flex-1">
                <p className="font-medium">{s.label}</p>
                <p className="text-xs text-muted">{s.detail}</p>
              </div>
            </div>
            {lines.length > 0 && (
              <ul className="mt-2 max-h-32 space-y-0.5 overflow-y-auto pl-8 font-mono text-[11px] text-muted">
                {lines.slice(-8).map((l, i) => (
                  <li key={i} className="truncate">
                    {l}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      {error && (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm">
          <p style={{ color: "var(--d5)" }}>{error}</p>
          <Link href="/" className="mt-2 inline-block text-accent hover:underline">
            Back to the library
          </Link>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />;
}
