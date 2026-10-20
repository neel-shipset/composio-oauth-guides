import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GuideView } from "@/app/components/GuideView";
import { getGuide } from "@/lib/store";
import { siteUrl } from "@/lib/site";

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
