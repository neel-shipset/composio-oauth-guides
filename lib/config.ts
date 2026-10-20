// Server-only settings. Read from .env.local locally and from Vercel env vars in production.
export const config = {
  modelMain: process.env.MODEL_MAIN ?? "claude-opus-5",
  modelFast: process.env.MODEL_FAST ?? "claude-haiku-4-5",
  // Live generation runs on every visitor request, so it uses the cheaper model by default.
  modelLive: process.env.MODEL_LIVE ?? "claude-sonnet-5",
  composioApiKey: process.env.COMPOSIO_API_KEY ?? "",
  rateLimitPerIpPerHour: Number(process.env.RATE_LIMIT_PER_IP_PER_HOUR ?? 10),
  pipelineVersion: "0.1.0",
};
