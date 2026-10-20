// Public base URL for share links in Markdown/Slack exports. Vercel sets VERCEL_PROJECT_PRODUCTION_URL.
export const siteUrl = (path: string) => {
  const base = process.env.SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return `${base}${path}`;
};
