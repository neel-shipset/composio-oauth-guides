import { config } from "@/lib/config";

// Two speeds over the same steps. Only page counts, page size and the model differ.
// "thorough" builds library guides; "live" runs while a developer watches and must stay cheap.
export type Profile = {
  name: "thorough" | "live";
  model: string; // extraction + writing
  officialPages: number;
  communityPages: number;
  charsPerPage: number; // excerpt size sent to the model (~4 chars per token)
  capUsd: number; // default spend cap for a run
  writerEffort: "medium" | "high";
};

export const PROFILES: Record<Profile["name"], Profile> = {
  thorough: { name: "thorough", model: config.modelMain, officialPages: 8, communityPages: 6, charsPerPage: 14000, capUsd: 2, writerEffort: "high" },
  live: { name: "live", model: config.modelLive, officialPages: 5, communityPages: 3, charsPerPage: 9000, capUsd: 1, writerEffort: "medium" },
};
