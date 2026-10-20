import data from "@/data/toolkits/composio-oauth-toolkits.json";

export type ToolkitEntry = { name: string; slug: string; managed: boolean };

// Snapshot of https://docs.composio.dev/toolkits/managed-auth (OAuth toolkits only).
export const toolkits: ToolkitEntry[] = [
  ...data.managed.map((t) => ({ ...t, managed: true })),
  ...data.bringYourOwn.map((t) => ({ ...t, managed: false })),
];

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function findToolkit(query: string): ToolkitEntry | undefined {
  const q = normalise(query);
  return toolkits.find((t) => normalise(t.slug) === q || normalise(t.name) === q);
}
