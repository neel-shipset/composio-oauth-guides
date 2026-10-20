import fs from "node:fs";
import { Guide } from "@/lib/schema";
const g = Guide.parse(JSON.parse(fs.readFileSync(process.argv[2], "utf8")));
const ids = new Set(g.claims.map((c) => c.id));
const used = new Set<string>();
const walk = (o: unknown) => {
  if (Array.isArray(o)) o.forEach(walk);
  else if (o && typeof o === "object")
    for (const [k, v] of Object.entries(o)) {
      if (k === "claimIds") (v as string[]).forEach((x) => used.add(x));
      else walk(v);
    }
};
walk(g);
const missing = [...used].filter((x) => !ids.has(x));
const orphan = [...ids].filter((x) => !used.has(x));
const counts = g.claims.reduce<Record<string, number>>((a, c) => ((a[c.evidence] = (a[c.evidence] ?? 0) + 1), a), {});
console.log({ valid: true, claims: g.claims.length, missing, orphan, counts, emDash: JSON.stringify(g).includes("—") });
