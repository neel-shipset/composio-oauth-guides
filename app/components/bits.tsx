import type { Claim, Guide } from "@/lib/schema";
import { DIFFICULTY, EVIDENCE } from "@/lib/render/labels";

export const evColor = (e: string) => `var(--ev-${e})`;

// Superscript source markers: colour = evidence level, number = position in the Sources list.
export function Refs({ ids, claims }: { ids: string[]; claims: Map<string, { n: number; claim: Claim }> }) {
  if (ids.length === 0) return null;
  return (
    <span className="ml-1 inline-flex gap-0.5 align-super">
      {ids.map((id) => {
        const c = claims.get(id);
        if (!c) return null;
        return (
          <a
            key={id}
            href={`#claim-${c.n}`}
            title={`${EVIDENCE[c.claim.evidence].label}: ${c.claim.text}`}
            className="rounded px-1 text-[10px] font-semibold leading-4 no-underline"
            style={{ color: evColor(c.claim.evidence), border: `1px solid ${evColor(c.claim.evidence)}` }}
          >
            {c.n}
          </a>
        );
      })}
    </span>
  );
}

export function DifficultyMeter({ level }: { level: Guide["verdict"]["difficulty"] }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1" aria-label={`Difficulty ${level} of 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className="h-2.5 w-7 rounded-full"
            style={{ background: i <= level ? `var(--d${level})` : "var(--border)" }}
          />
        ))}
      </div>
      <span className="text-sm font-semibold" style={{ color: `var(--d${level})` }}>
        {level}/5 · {DIFFICULTY[level].name}
      </span>
    </div>
  );
}

export function Badge({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ color: color ?? "var(--muted)", borderColor: color ?? "var(--border)" }}
    >
      {children}
    </span>
  );
}

export function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10">
      <h2 className="mb-3 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
