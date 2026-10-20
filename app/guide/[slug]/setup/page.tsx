import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GuidedSetup } from "@/app/components/GuidedSetup";
import { getGuide } from "@/lib/store";

export default function SetupPage({ params }: PageProps<"/guide/[slug]/setup">) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8 sm:px-6">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Setup params={params} />
      </Suspense>
    </main>
  );
}

async function Setup({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getGuide(slug);
  if (!found) notFound();
  return (
    <>
      <nav className="mb-6 flex gap-4 text-sm text-muted">
        <Link href={`/guide/${slug}`} className="hover:text-text">
          ← Back to the {found.guide.name} guide
        </Link>
        <Link href="/" className="hover:text-text">
          All guides
        </Link>
      </nav>
      <p className="text-sm text-muted">Guided setup</p>
      <h1 className="text-2xl font-semibold tracking-tight">{found.guide.name}: set up your own OAuth app</h1>
      <GuidedSetup guide={found.guide} />
    </>
  );
}
