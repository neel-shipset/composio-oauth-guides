"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import type { Guide } from "@/lib/schema";
import { ACTOR } from "@/lib/render/labels";
import { CopyButton } from "./CopyButton";

// Checklist built from the guide's steps. Progress is kept in this browser only.
export function GuidedSetup({ guide }: { guide: Guide }) {
  const steps = guide.stages.flatMap((s, si) => s.steps.map((st, i) => ({ ...st, stage: s.name, key: `${si}.${i}` })));
  const storageKey = `setup:${guide.slug}`;
  const raw = useSyncExternalStore(subscribe, () => readProgress(storageKey), () => "{}");
  const done = JSON.parse(raw) as Record<string, boolean>;
  const [open, setOpen] = useState<string | null>(null);

  const toggle = (key: string) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...done, [key]: !done[key] }));
    } catch {}
    window.dispatchEvent(new Event(PROGRESS_EVENT));
  };

  const completed = steps.filter((s) => done[s.key]).length;
  const current = steps.find((s) => !done[s.key]);

  return (
    <div>
      <div className="mt-6 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {completed} of {steps.length} steps done
          </span>
          <Link href={`/guide/${guide.slug}`} className="text-accent hover:underline">
            Full guide
          </Link>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-accent transition-all" style={{ width: `${(completed / Math.max(1, steps.length)) * 100}%` }} />
        </div>
        {current && <p className="mt-3 text-sm text-muted">Next: {current.title}</p>}
      </div>

      <ol className="mt-6 space-y-3">
        {steps.map((st, i) => {
          const isOpen = open === st.key || (open === null && st.key === current?.key);
          return (
            <li key={st.key} className="rounded-lg border border-border bg-surface">
              <div className="flex items-start gap-3 p-4">
                <input
                  type="checkbox"
                  checked={!!done[st.key]}
                  onChange={() => toggle(st.key)}
                  className="mt-1 h-4 w-4 accent-[var(--accent)]"
                  aria-label={`Mark "${st.title}" done`}
                />
                <button type="button" onClick={() => setOpen(isOpen ? "" : st.key)} className="flex-1 text-left">
                  <p className="text-xs text-muted">{st.stage}</p>
                  <p className={`font-medium ${done[st.key] ? "text-muted line-through" : ""}`}>
                    {i + 1}. {st.title}
                  </p>
                  <p className="text-xs text-muted">{ACTOR[st.actor]}</p>
                </button>
              </div>
              {isOpen && (
                <div className="border-t border-border p-4 text-sm">
                  <p className="leading-relaxed">{st.detail}</p>
                  {st.humanReason && <p className="mt-1 text-xs text-muted">Why you: {st.humanReason}</p>}
                  {st.preparedValues.map((pv) => (
                    <div key={pv.label} className="mt-3 rounded-md bg-surface-2 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted">{pv.label}</span>
                        <CopyButton text={pv.value} />
                      </div>
                      <code className="mt-1 block break-all font-mono text-xs">{pv.value}</code>
                    </div>
                  ))}
                  {st.links.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {st.links.map((l) => (
                        <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                          {l.label} ↗
                        </a>
                      ))}
                    </div>
                  )}
                  <Stuck slug={guide.slug} step={st.title} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// Progress lives in this browser only; storage can be unavailable (private mode), so reads are guarded.
const PROGRESS_EVENT = "setup-progress";
function subscribe(onChange: () => void) {
  window.addEventListener(PROGRESS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(PROGRESS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
function readProgress(key: string) {
  try {
    return localStorage.getItem(key) ?? "{}";
  } catch {
    return "{}";
  }
}

function Stuck({ slug, step }: { slug: string; step: string }) {
  const [problem, setProblem] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <details className="mt-4 rounded-md border border-border p-3">
      <summary className="cursor-pointer text-sm font-medium">I&apos;m stuck on this step</summary>
      <textarea
        value={problem}
        onChange={(e) => setProblem(e.target.value)}
        placeholder="Paste the error or describe what you see. Never paste secrets."
        className="mt-2 h-20 w-full rounded-md border border-border bg-surface-2 p-2 text-sm"
      />
      <button
        type="button"
        disabled={busy || !problem.trim()}
        onClick={async () => {
          setBusy(true);
          setAnswer(null);
          const res = await fetch("/api/stuck", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug, step, problem }),
          });
          const body = await res.json().catch(() => ({ error: res.statusText }));
          setAnswer(body.answer ?? body.error);
          setBusy(false);
        }}
        className="mt-2 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        {busy ? "Thinking…" : "Get help"}
      </button>
      {answer && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{answer}</p>}
    </details>
  );
}
