// Per-instance abuse guard for the public endpoints that spend API credit. Good enough for a
// demo; a shared limit across instances would live in Redis.
const hits = new Map<string, number[]>();

export function allowed(key: string, perHour: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 3600_000);
  if (recent.length >= perHour) return false;
  hits.set(key, [...recent, now]);
  return true;
}

export const clientIp = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
