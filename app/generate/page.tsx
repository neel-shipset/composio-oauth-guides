import Link from "next/link";
import { Suspense } from "react";
import { LiveGenerator } from "@/app/components/LiveGenerator";

export default function GeneratePage({ searchParams }: PageProps<"/generate">) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8 sm:px-6">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/" className="hover:text-text">
          ← All guides
        </Link>
      </nav>
      <Suspense>
        <Generate searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Generate({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = String((await searchParams).q ?? "").trim().slice(0, 200);
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Researching “{q}”</h1>
      {q ? <LiveGenerator query={q} /> : <p className="mt-4 text-muted">No app given.</p>}
    </>
  );
}
