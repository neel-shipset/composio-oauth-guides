// Step 2a (code, no model): read Composio's own pages for this toolkit.
// The toolkit docs page has machine-readable lines, e.g.
//   - **Auth:** DCR_OAUTH
//   - **Composio-managed OAuth available?** No
// Those become quoted findings directly. The credentials guide and knowledge-base pages are
// returned as pages for the extraction step.
import { toolkits } from "@/lib/toolkits";
import type { Finding } from "./types";

export type ComposioInfo = {
  toolkitSlug: string | null;
  managedInDirectory: boolean | null; // managed-auth directory snapshot
  managedLive: boolean | null; // the toolkit page
  authSchemes: string[]; // DCR_OAUTH means the client registers itself: no app to create
  findings: Finding[];
  pageUrls: string[]; // more Composio pages for the extraction step
};

export async function readComposio(slug: string | null, appName: string): Promise<ComposioInfo> {
  if (!slug) return { toolkitSlug: null, managedInDirectory: null, managedLive: null, authSchemes: [], findings: [], pageUrls: [] };
  const lower = slug.toLowerCase();
  const entry = toolkits.find((t) => t.slug === slug);
  const pageUrl = `https://docs.composio.dev/toolkits/${lower}`;
  let authSchemes: string[] = [];
  let managed: boolean | null = null;
  try {
    const res = await fetch(`${pageUrl}.md`, { signal: AbortSignal.timeout(15000) });
    if (res.ok) {
      const text = await res.text();
      authSchemes = text.match(/^- \*\*Auth:\*\* (.+)$/m)?.[1]?.split(",").map((a) => a.trim()) ?? [];
      const m = text.match(/^- \*\*Composio-managed OAuth available\?\*\* (Yes|No)/m)?.[1];
      managed = m ? m === "Yes" : null;
    }
  } catch {}

  const today = new Date().toISOString().slice(0, 10);
  const title = `Composio: ${entry?.name ?? appName} toolkit`;
  const findings: Finding[] = [];
  if (authSchemes.length)
    findings.push({ id: "k1", origin: "composio", topic: "composio", evidence: "official", text: `Composio's ${entry?.name ?? appName} toolkit supports these auth schemes: ${authSchemes.join(", ")}.`, sources: [{ url: pageUrl, title, quote: `Auth: ${authSchemes.join(", ")}`, publishedAt: today }] });
  if (managed !== null)
    findings.push({ id: "k2", origin: "composio", topic: "composio", evidence: "official", text: `Composio-managed OAuth is ${managed ? "available" : "not available"} for this toolkit.`, sources: [{ url: pageUrl, title, quote: `Composio-managed OAuth available? ${managed ? "Yes" : "No"}`, publishedAt: today }] });

  return {
    toolkitSlug: slug,
    managedInDirectory: entry?.managed ?? null,
    managedLive: managed,
    authSchemes,
    findings,
    pageUrls: [`https://composio.dev/auth/${lower.replace(/_/g, "")}`, `https://docs.composio.dev/kb/guide/toolkits-${lower}`],
  };
}
