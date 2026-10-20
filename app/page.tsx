import Link from "next/link";
import { Suspense } from "react";
import { GuideCard } from "./components/GuideCard";
import { SearchBox } from "./components/SearchBox";
import { listLibraryGuides, listLiveGuides } from "@/lib/store";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-14 sm:px-6">
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
          <p className="mt-2 text-xs text-muted">Not in the library? It is researched live in about two to three minutes, then saved with a shareable link.</p>
        </div>

        <section className="mt-10 rounded-xl border border-border bg-accent-soft p-5 text-sm leading-relaxed">
          <p className="font-semibold">Finding: about half of the &quot;bring your own OAuth app&quot; list needs no app at all</p>
          <p className="mt-1">
            Composio lists 211 toolkits where developers must register their own OAuth app. 102 of them are MCP servers,
            and 99 of those use dynamic client registration: the client registers itself, so there is nothing to create
            or get approved. See the{" "}
            <Link href="/guide/notion_mcp" className="text-accent hover:underline">Notion MCP guide</Link> for a worked example,
            or the{" "}
            <a href="https://github.com/neel-shipset/composio-oauth-guides/blob/main/data/toolkits/byo-auth-schemes.json" className="text-accent hover:underline">
              auth scheme of all 211
            </a>
            .
          </p>
        </section>

        <h2 className="mt-12 text-lg font-semibold">Library</h2>
        <p className="mt-1 text-sm text-muted">Researched in depth and checked by hand against their sources.</p>
        <Suspense fallback={<p className="mt-4 text-sm text-muted">Loading…</p>}>
          <Library />
        </Suspense>

        <Suspense fallback={null}>
          <Live />
        </Suspense>
    </main>
  );
}

async function Search() {
  const guides = await listLibraryGuides();
  return <SearchBox library={guides.map((g) => ({ slug: g.slug, name: g.name }))} />;
}

async function Library() {
  const guides = (await listLibraryGuides()).sort((a, b) => a.verdict.difficulty - b.verdict.difficulty || a.name.localeCompare(b.name));
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {guides.map((g) => (
        <GuideCard key={g.slug} g={g} />
      ))}
    </div>
  );
}

async function Live() {
  const library = new Set((await listLibraryGuides()).map((g) => g.slug));
  const guides = (await listLiveGuides().catch(() => [])).filter((g) => !library.has(g.slug));
  if (guides.length === 0) return null;
  return (
    <>
      <h2 className="mt-12 text-lg font-semibold">Generated live</h2>
      <p className="mt-1 text-sm text-muted">Researched on request by the pipeline, with every quote checked against its page by code.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {guides.map((g) => (
          <GuideCard key={g.slug} g={g} />
        ))}
      </div>
    </>
  );
}
