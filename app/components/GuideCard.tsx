import Link from "next/link";
import type { Guide } from "@/lib/schema";
import { DifficultyMeter } from "./bits";

export function GuideCard({ g }: { g: Guide }) {
  return (
    <Link href={`/guide/${g.slug}`} className="rounded-xl border border-border bg-surface p-4 transition hover:border-accent">
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
      <p className="mt-1 line-clamp-3 text-sm">
        <span className="text-muted">Main blocker: </span>
        {g.verdict.mainBlocker}
      </p>
    </Link>
  );
}
