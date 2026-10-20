import fs from "node:fs/promises";
import path from "node:path";
import { Guide } from "./schema";

// Library guides: JSON in the repo, hand-checked, readable by reviewers.
// Live guides: generated on demand. Stored in Upstash Redis when configured (production),
// else in data/generated/ (local dev), so share links keep working.
const LIBRARY_DIR = path.join(process.cwd(), "data", "guides");
const GENERATED_DIR = path.join(process.cwd(), "data", "generated");
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export async function listLibraryGuides(): Promise<Guide[]> {
  const files = (await fs.readdir(LIBRARY_DIR)).filter((f) => f.endsWith(".json"));
  const guides = await Promise.all(files.map((f) => readGuideFile(path.join(LIBRARY_DIR, f))));
  return guides.filter((g): g is Guide => g !== null).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getGuide(slug: string): Promise<{ guide: Guide; source: "library" | "live" } | null> {
  const safe = slug.replace(/[^a-z0-9_]/g, "");
  const lib = await readGuideFile(path.join(LIBRARY_DIR, `${safe}.json`));
  if (lib) return { guide: lib, source: "library" };
  const live = redisUrl ? await redisGet(`guide:${safe}`) : await readGuideFile(path.join(GENERATED_DIR, `${safe}.json`));
  return live ? { guide: live, source: "live" } : null;
}

export async function saveLiveGuide(guide: Guide) {
  if (redisUrl) {
    await redisCommand(["SET", `guide:${guide.slug}`, JSON.stringify(guide)]);
    // Most recent first, no duplicates, last 24 kept: shown on the home page.
    await redisCommand(["LREM", "recent", "0", guide.slug]);
    await redisCommand(["LPUSH", "recent", guide.slug]);
    await redisCommand(["LTRIM", "recent", "0", "23"]);
    return;
  }
  await fs.writeFile(path.join(GENERATED_DIR, `${guide.slug}.json`), JSON.stringify(guide, null, 2) + "\n");
}

// Live-generated guides, newest first (library guides excluded).
export async function listLiveGuides(): Promise<Guide[]> {
  if (redisUrl) {
    const { result } = await redisCommand(["LRANGE", "recent", "0", "23"]);
    const slugs = Array.isArray(result) ? (result as string[]) : [];
    const guides = await Promise.all(slugs.map((s) => redisGet(`guide:${s}`).catch(() => null)));
    return guides.filter((g): g is Guide => g !== null);
  }
  const files = (await fs.readdir(GENERATED_DIR).catch(() => [])).filter((f) => f.endsWith(".json") && !f.endsWith(".run.json") && !f.endsWith(".eval.json"));
  const guides = await Promise.all(files.map((f) => readGuideFile(path.join(GENERATED_DIR, f)).catch(() => null)));
  return guides.filter((g): g is Guide => g !== null);
}

async function readGuideFile(file: string): Promise<Guide | null> {
  try {
    return Guide.parse(JSON.parse(await fs.readFile(file, "utf8")));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

async function redisCommand(command: string[]) {
  const res = await fetch(redisUrl!, {
    method: "POST",
    headers: { Authorization: `Bearer ${redisToken}` },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis ${command[0]} failed: ${res.status}`);
  return (await res.json()) as { result: unknown };
}

async function redisGet(key: string): Promise<Guide | null> {
  const { result } = await redisCommand(["GET", key]);
  return typeof result === "string" ? Guide.parse(JSON.parse(result)) : null;
}
