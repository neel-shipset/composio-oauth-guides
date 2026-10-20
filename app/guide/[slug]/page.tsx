import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GuideView } from "@/app/components/GuideView";
import { getGuide } from "@/lib/store";
import { siteUrl } from "@/lib/site";
import { DIFFICULTY } from "@/lib/render/labels";

// Tab title and link preview: the verdict, so a shared link already answers the question.
export async function generateMetadata({ params }: PageProps<"/guide/[slug]">): Promise<Metadata> {
  const found = await getGuide((await params).slug);
  if (!found) return { title: "Guide not found" };
  const g = found.guide;
  const title = `${g.name} OAuth app: ${g.verdict.difficulty}/5 ${DIFFICULTY[g.verdict.difficulty].name}`;
  return { title, description: g.verdict.summary, openGraph: { title, description: g.verdict.summary } };
}

export default function GuidePage({ params }: PageProps<"/guide/[slug]">) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-3xl px-4 py-12 text-muted">Loading guide…</p>}>
      <Guide params={params} />
    </Suspense>
  );
}

async function Guide({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getGuide(slug);
  if (!found) notFound();
  return <GuideView guide={found.guide} source={found.source} url={siteUrl(`/guide/${slug}`)} />;
}
