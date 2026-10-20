import { config } from "./config";

// Live check against Composio's API: does Composio provide the OAuth app for this toolkit?
// Docs: https://docs.composio.dev/toolkits/managed-auth ("Check with the API").
export async function getToolkitMeta(slug: string) {
  if (!config.composioApiKey) return null;
  const res = await fetch(`https://backend.composio.dev/api/v3.1/toolkits/${slug.toLowerCase()}`, {
    headers: { "x-api-key": config.composioApiKey },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Composio toolkit lookup failed: ${res.status}`);
  const body = await res.json();
  return {
    raw: body,
    managedAuthSchemes: (body.composio_managed_auth_schemes ?? []) as string[],
  };
}
