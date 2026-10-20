// Fetches pages with plain HTTP (no model, no cost), turns HTML into text, and keeps only the
// paragraphs that matter for OAuth setup and approval. The full text is kept too, so quotes the
// model extracts can be checked against the page by code.

export type Page = {
  id: string; // P1, P2, ... as shown to the extraction model
  url: string;
  finalUrl: string;
  title: string;
  publishedAt?: string;
  kind: "official" | "community" | "composio";
  fullText: string;
  excerpt: string; // the relevant paragraphs only, capped
};

const KEYWORDS =
  /oauth|client[ _-]?id|client secret|redirect|callback|scope|review|verif|approv|publish|distribut|marketplace|app store|rate limit|quota|token|refresh|expir|admin|consent|privacy|security|assessment|partner|tier|pricing|install|sandbox|test user|development|production|unverified|restricted|sensitive|reject|business days|weeks/i;

const MAX_BYTES = 3_000_000;

export async function fetchPage(url: string, timeoutMs = 15000): Promise<{ finalUrl: string; html: string; status: number } | null> {
  try {
    // Some docs sites (Google) localise by location; ask for English explicitly.
    const target = /(^|\.)google\.com$/.test(new URL(url).hostname) && !/[?&]hl=/.test(url) ? `${url}${url.includes("?") ? "&" : "?"}hl=en` : url;
    const res = await fetch(target, {
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; oauth-guides-research/1.0)", Accept: "text/html,text/plain,*/*", "Accept-Language": "en-US,en;q=0.9" },
    });
    const html = (await res.text()).slice(0, MAX_BYTES);
    return { finalUrl: res.url || url, html, status: res.status };
  } catch {
    return null;
  }
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(nav|footer)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(br|\/p|\/li|\/h[1-6]|\/tr|\/div|\/section|\/article|\/dd|\/dt|\/blockquote|\/pre)[^>]*>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function decodeEntities(s: string) {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', mdash: "-", ndash: "-", hellip: "..." };
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => named[n.toLowerCase()] ?? m);
}

export function pageTitle(html: string) {
  return decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "").replace(/\s+/g, " ");
}

// Publication or update date from common metadata, when the page states one.
export function pageDate(html: string): string | undefined {
  const m =
    html.match(/(?:article:modified_time|article:published_time|last-modified|dateModified|datePublished)["']?\s*(?:content=|:)\s*["']([0-9]{4}-[0-9]{2}(?:-[0-9]{2})?)/i) ??
    html.match(/<time[^>]+datetime=["']([0-9]{4}-[0-9]{2}(?:-[0-9]{2})?)/i) ??
    html.match(/ms\.date:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  return m?.[1];
}

// Relevant paragraphs plus one line of context either side, capped.
export function relevantExcerpt(text: string, maxChars: number): string {
  const lines = text.split("\n");
  const keep = new Set<number>();
  lines.forEach((l, i) => {
    if (l.length > 20 && KEYWORDS.test(l)) [i - 1, i, i + 1].forEach((j) => j >= 0 && j < lines.length && keep.add(j));
  });
  let out = "";
  let last = -2;
  for (const i of [...keep].sort((a, b) => a - b)) {
    const line = (i !== last + 1 ? "\n[...]\n" : "\n") + lines[i];
    if (out.length + line.length > maxChars) break;
    out += line;
    last = i;
  }
  return out.trim();
}

// For checking quotes: lowercase, unify quotes and dashes, drop punctuation, collapse spaces.
export const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’“”`"']/g, "")
    .replace(/[–—-]/g, " ")
    .replace(/[^a-z0-9$%. ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export async function loadPages(
  targets: { url: string; kind: Page["kind"] }[],
  maxCharsPerPage: number,
): Promise<{ pages: Page[]; failed: string[] }> {
  const seen = new Set<string>();
  const unique = targets.filter((t) => !seen.has(t.url) && seen.add(t.url));
  const results = await Promise.all(unique.map(async (t) => ({ t, r: await fetchPage(t.url) })));
  const pages: Page[] = [];
  const failed: string[] = [];
  for (const { t, r } of results) {
    if (!r || r.status >= 400) {
      failed.push(t.url);
      continue;
    }
    const fullText = /<html|<body|<div/i.test(r.html) ? htmlToText(r.html) : r.html;
    const excerpt = relevantExcerpt(fullText, maxCharsPerPage);
    if (excerpt.length < 200) {
      failed.push(t.url); // empty shell (JS-rendered page) or nothing relevant
      continue;
    }
    pages.push({
      id: `P${pages.length + 1}`,
      url: t.url,
      finalUrl: r.finalUrl,
      title: pageTitle(r.html) || t.url,
      publishedAt: pageDate(r.html),
      kind: t.kind,
      fullText,
      excerpt,
    });
  }
  return { pages, failed };
}
