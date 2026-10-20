"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const norm = (s: string) => s.toLowerCase().replace(/^https?:\/\//, "").replace(/[^a-z0-9]/g, "");

export function SearchBox({ library }: { library: { slug: string; name: string }[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        if (!query) return;
        const hit = library.find((g) => norm(g.slug) === norm(query) || norm(g.name) === norm(query));
        router.push(hit ? `/guide/${hit.slug}` : `/generate?q=${encodeURIComponent(query)}`);
      }}
      className="flex w-full flex-col gap-2 sm:flex-row"
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="App name or website, e.g. Jira, HubSpot, linear.app"
        className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-accent"
        aria-label="App name or website"
      />
      <button type="submit" className="rounded-lg bg-accent px-5 py-3 text-sm font-medium text-white hover:opacity-90">
        Get the guide
      </button>
    </form>
  );
}
