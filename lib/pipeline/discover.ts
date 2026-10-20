// Step 1 (small model + a couple of web searches): identify the app and pick the pages to read.
// The model only chooses URLs. Code fetches and reads them, which costs nothing.
import { z } from "zod";
import { config } from "@/lib/config";
import { recorder, runAgent, webSearchBasic, type AgentLog } from "@/lib/llm";
import { findToolkit, toolkits } from "@/lib/toolkits";

export const Discovery = z.object({
  name: z.string().describe("Product name as the provider writes it, e.g. 'Jira', 'LinkedIn Ads'"),
  provider: z.string().describe("Company that runs the OAuth program, e.g. 'Atlassian'"),
  developerPortalUrl: z.string().describe("Page where developers create OAuth apps, or empty if unknown"),
  toolkitSlug: z.string().describe("Matching Composio toolkit slug from the list, or empty if none"),
  providerDomains: z.array(z.string()).describe("Domains the provider owns and publishes docs on, e.g. ['atlassian.com', 'atlassian.net']"),
  ambiguousWith: z.array(z.string()).describe("Other products this query could mean; empty if clear"),
  notFound: z.boolean().describe("True if no real product with a public developer program matches"),
  officialUrls: z.array(z.string()).describe("Provider documentation pages: OAuth app registration, scopes, review/verification/publishing policy, rate limits"),
  communityUrls: z.array(z.string()).describe("Forum threads, GitHub issues or blog posts about real approval wait times, rejections or setup errors, newest first"),
});
export type Discovery = z.infer<typeof Discovery>;

const SYSTEM = (maxOfficial: number, maxCommunity: number) => `You prepare research for a guide on registering an OAuth app with a provider and getting it approved, for a developer whose AI agent (built on Composio) connects users' accounts.
1. Identify the product. Match it to the Composio toolkit list when one fits, preferring the most specific toolkit (e.g. "linkedin ads" is LINKEDIN_ADS). If the query could mean several products, list them in ambiguousWith.
2. Find the pages a researcher must read. Use web search (at most 3 searches). Choose:
   - up to ${maxOfficial} official provider documentation URLs: how to create the OAuth app, scopes, what is needed before outside users can connect (publishing, review, verification), rate limits;
   - up to ${maxCommunity} community URLs (forum threads, GitHub issues, blog posts) about real approval times, rejections or setup errors, preferring the last two years.
   Prefer specific pages over index pages. Only include URLs you saw in search results.
Call submit_discovery once.`;

export async function discover(query: string, maxOfficial: number, maxCommunity: number, log: AgentLog): Promise<Discovery> {
  const exact = findToolkit(query);
  const { tool, items } = recorder("submit_discovery", "Submit the identified app and the pages to read.", Discovery);
  await runAgent({
    model: config.modelFast,
    system: SYSTEM(maxOfficial, maxCommunity),
    prompt: [
      `Query: ${query}`,
      exact ? `This exactly matches Composio toolkit ${exact.slug} (${exact.name}).` : "",
      `Composio OAuth toolkits (slug: name):\n${toolkits.map((t) => `${t.slug}: ${t.name}`).join("\n")}`,
    ].join("\n\n"),
    tools: [tool],
    serverTools: [webSearchBasic(3)],
    maxIterations: 8,
    log,
  });
  const d = items.at(-1);
  if (!d) throw new Error("Discovery returned no result");
  // Never let the model invent a toolkit slug.
  if (d.toolkitSlug && !toolkits.some((t) => t.slug === d.toolkitSlug)) d.toolkitSlug = "";
  if (exact) d.toolkitSlug = exact.slug;
  d.officialUrls = d.officialUrls.filter(isUrl).slice(0, maxOfficial);
  d.communityUrls = d.communityUrls.filter(isUrl).slice(0, maxCommunity);
  return d;
}

const isUrl = (u: string) => /^https?:\/\/\S+$/.test(u);
