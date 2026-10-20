import Link from "next/link";
import { Suspense } from "react";
import { DifficultyMeter } from "./components/bits";
import { SearchBox } from "./components/SearchBox";
import { listLibraryGuides } from "@/lib/store";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-14 sm:px-6">
      <p className="text-sm font-medium text-accent">For developers building AI agents on Composio</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">How hard is it to get your own OAuth app approved?</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
        Look up any app. Get the difficulty, the time to go live including approval waits, what can block you, what an
        agent can do for you and where you take over. Every claim is labelled tested, official, community or unverified.
      </p>
      <div className="mt-8">
        <Suspense fallback={<SearchBox library={[]} />}>
          <Search />
        </Suspense>
        <p className="mt-2 text-xs text-muted">Not in the library? It is researched live in about a minute.</p>
      </div>
      <h2 className="mt-14 text-lg font-semibold">Library</h2>
      <Suspense fallback={<p className="mt-4 text-sm text-muted">Loading…</p>}>
        <Library />
      </Suspense>
    </main>
  );
}

async function Search() {
  const guides = await listLibraryGuides();
  return <SearchBox library={guides.map((g) => ({ slug: g.slug, name: g.name }))} />;
}

async function Library() {
  const guides = await listLibraryGuides();
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {guides.map((g) => (
        <Link
          key={g.slug}
          href={`/guide/${g.slug}`}
          className="rounded-xl border border-border bg-surface p-4 transition hover:border-accent"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold">{g.name}</span>
            <span className="text-xs text-muted">{g.provider}</span>
          </div>
          <div className="mt-3">
            <DifficultyMeter level={g.verdict.difficulty} />
          </div>
          <p className="mt-3 text-sm">
            <span className="text-muted">To production: </span>
            {g.verdict.timeToProduction.label}
          </p>
          <p className="mt-1 text-sm">
            <span className="text-muted">Main blocker: </span>
            {g.verdict.mainBlocker}
          </p>
        </Link>
      ))}
    </div>
  );
}
