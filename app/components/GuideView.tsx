import Link from "next/link";
import type { Claim, Guide } from "@/lib/schema";
import { ACTOR, EVIDENCE, NEED_OWN_APP } from "@/lib/render/labels";
import { toMarkdown } from "@/lib/render/markdown";
import { toSlack } from "@/lib/render/slack";
import { Badge, DifficultyMeter, evColor, Refs, Section } from "./bits";
import { CopyButton } from "./CopyButton";
import { ShareBar } from "./ShareBar";

const actorColor = { agent: "var(--ev-tested)", human: "var(--accent)", either: "var(--muted)" } as const;

export function GuideView({ guide: g, url, source }: { guide: Guide; url: string; source: "library" | "live" }) {
  const claims = new Map<string, { n: number; claim: Claim }>(g.claims.map((c, i) => [c.id, { n: i + 1, claim: c }]));
  const counts = g.claims.reduce<Record<string, number>>((a, c) => ((a[c.evidence] = (a[c.evidence] ?? 0) + 1), a), {});
  const v = g.verdict;

  return (
    <article className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8 sm:px-6">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/" className="hover:text-text">
          ← All guides
        </Link>
      </nav>

      <header>
        <p className="text-sm text-muted">{g.provider} · OAuth app setup and approval</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{g.name}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge>{g.composio.toolkitSlug ? `Composio toolkit ${g.composio.toolkitSlug}` : "Not a Composio toolkit"}</Badge>
          <Badge>
            Composio-managed OAuth:{" "}
            {g.composio.managedOAuth === null ? "unconfirmed" : g.composio.managedOAuth ? "yes" : "no"}
          </Badge>
          <Badge>{source === "library" ? "Library guide, hand-checked" : "Generated live by agents"}</Badge>
          <Badge>Updated {g.generatedAt}</Badge>
        </div>
        <div className="mt-4">
          <ShareBar markdown={toMarkdown(g, url)} slack={toSlack(g, url)} slug={g.slug} />
        </div>
      </header>

      {/* Verdict card: the answer first */}
      <section className="mt-8 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <DifficultyMeter level={v.difficulty} />
        <p className="mt-3 text-[15px] leading-relaxed">{v.summary}</p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Time to testing</dt>
            <dd className="mt-1 font-medium">
              {v.timeToTesting.label}
              <Refs ids={v.timeToTesting.claimIds} claims={claims} />
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Time to production</dt>
            <dd className="mt-1 font-medium">
              {v.timeToProduction.label}
              <Refs ids={v.timeToProduction.claimIds} claims={claims} />
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Main blocker</dt>
            <dd className="mt-1 text-sm">{v.mainBlocker}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-muted">
          Confidence: <span className="font-medium text-text">{v.confidence}</span> · Based on {g.claims.length} claims:{" "}
          {Object.entries(counts)
            .map(([e, n]) => `${n} ${EVIDENCE[e].label.toLowerCase()}`)
            .join(", ")}
        </p>
      </section>

      {/* Do you even need your own app? */}
      <section className="mt-4 rounded-xl border border-border bg-accent-soft p-5">
        <h2 className="font-semibold">
          Do you need your own OAuth app? {NEED_OWN_APP[g.needOwnApp.verdict]}
          <Refs ids={g.needOwnApp.claimIds} claims={claims} />
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
          {g.needOwnApp.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/guide/${g.slug}/setup`}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Start guided setup
        </Link>
        <span className="text-sm text-muted">A step-by-step checklist with an assistant for when you get stuck.</span>
      </div>

      {g.stages.map((s, i) => (
        <Section key={s.name} title={`Stage ${i + 1}: ${s.name}`}>
          <p className="-mt-2 mb-3 text-sm text-muted">
            {s.duration.label}
            <Refs ids={s.duration.claimIds} claims={claims} />
          </p>
          {s.limits.length > 0 && (
            <ul className="mb-4 space-y-1 rounded-lg border border-border bg-surface-2 p-3 text-sm">
              {s.limits.map((l) => (
                <li key={l}>⚠ {l}</li>
              ))}
            </ul>
          )}
          <ol className="space-y-3">
            {s.steps.map((st, j) => (
              <li key={st.title} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-muted">{j + 1}.</span>
                  <h3 className="font-medium">{st.title}</h3>
                  <Badge color={actorColor[st.actor]}>{ACTOR[st.actor]}</Badge>
                  <Refs ids={st.claimIds} claims={claims} />
                </div>
                <p className="mt-2 text-sm leading-relaxed">{st.detail}</p>
                {st.humanReason && <p className="mt-1 text-xs text-muted">Why you: {st.humanReason}</p>}
                {st.preparedValues.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {st.preparedValues.map((pv) => (
                      <div key={pv.label} className="rounded-md bg-surface-2 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted">{pv.label}</span>
                          <CopyButton text={pv.value} />
                        </div>
                        <code className="mt-1 block break-all font-mono text-xs">{pv.value}</code>
                      </div>
                    ))}
                  </div>
                )}
                {st.links.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-3 text-sm">
                    {st.links.map((l) => (
                      <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                        {l.label} ↗
                      </a>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </Section>
      ))}

      {g.requirements.length > 0 && (
        <Section title="Requirements">
          <ul className="space-y-2 text-sm leading-relaxed">
            {g.requirements.map((r) => (
              <li key={r.title}>
                <span className="font-medium">{r.title}.</span> {r.detail}
                <Refs ids={r.claimIds} claims={claims} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {g.blockers.length > 0 && (
        <Section title="If you get stuck">
          <div className="space-y-3">
            {g.blockers.map((b) => (
              <div key={b.title} className="rounded-lg border border-border bg-surface p-4 text-sm">
                <p className="font-medium">
                  {b.title}
                  <Refs ids={b.claimIds} claims={claims} />
                </p>
                <p className="mt-1">
                  <span className="text-muted">You see: </span>
                  {b.symptom}
                </p>
                <p className="mt-1">
                  <span className="text-muted">Fix: </span>
                  {b.fix}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="What an agent can do, and what you must do">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="text-sm font-semibold" style={{ color: "var(--ev-tested)" }}>
              Agent can
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {g.handoff.agentCan.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="text-sm font-semibold text-accent">You must</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {g.handoff.youMust.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {g.attempt && (
        <Section title="What our agent tried">
          <p className="-mt-2 mb-3 text-sm text-muted">
            {g.attempt.mode === "full" ? "Full attempt with a test account" : "Public pages only, no sign-in"} ·{" "}
            {g.attempt.ranAt}
            {g.attempt.stoppedAt ? ` · Stopped at: ${g.attempt.stoppedAt}` : ""}
          </p>
          <ol className="space-y-1 text-sm">
            {g.attempt.log.map((e, i) => (
              <li key={i} className="flex gap-2">
                <span>{e.result === "done" ? "✓" : e.result === "blocked" ? "✕" : "–"}</span>
                <span>
                  <span className="font-medium">{e.step}.</span> <span className="text-muted">{e.note}</span>
                </span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {g.unknowns.length > 0 && (
        <Section title="Not yet known">
          <div className="space-y-3">
            {g.unknowns.map((u) => (
              <details key={u.question} className="rounded-lg border border-border bg-surface p-4 text-sm">
                <summary className="cursor-pointer font-medium">{u.question}</summary>
                <p className="mt-2">{u.whyItMatters}</p>
                <p className="mt-1 text-muted">Ask: {u.askWhom}</p>
                {u.draftEmail && (
                  <div className="mt-3 rounded-md bg-surface-2 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted">Draft email</span>
                      <CopyButton text={u.draftEmail} />
                    </div>
                    <p className="mt-1 whitespace-pre-line">{u.draftEmail}</p>
                  </div>
                )}
              </details>
            ))}
          </div>
        </Section>
      )}

      <Section title="Sources and evidence" id="sources">
        <div className="mb-3 flex flex-wrap gap-3 text-xs">
          {Object.entries(EVIDENCE).map(([k, e]) => (
            <span key={k} style={{ color: evColor(k) }}>
              ● {e.label}
            </span>
          ))}
        </div>
        <ol className="space-y-2 text-sm">
          {g.claims.map((c, i) => (
            <li key={c.id} id={`claim-${i + 1}`} className="scroll-mt-20 rounded-md p-2 target:bg-accent-soft">
              <span className="mr-2 font-semibold" style={{ color: evColor(c.evidence) }}>
                {i + 1}. {EVIDENCE[c.evidence].label}
              </span>
              {c.text}
              {c.sources.length > 0 && (
                <span className="mt-1 block text-xs text-muted">
                  {c.sources.map((s, k) => (
                    <span key={s.url + k}>
                      {k > 0 && " · "}
                      <a href={s.url} target="_blank" rel="noreferrer" className="hover:underline">
                        {s.title}
                      </a>
                      {s.publishedAt && ` (${s.publishedAt})`}
                    </span>
                  ))}
                </span>
              )}
            </li>
          ))}
        </ol>
      </Section>
    </article>
  );
}
