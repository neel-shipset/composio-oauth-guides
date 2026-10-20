"use client";
import { CopyButton } from "./CopyButton";

export function ShareBar({ markdown, slack, slug }: { markdown: string; slack: string; slug: string }) {
  const download = () => {
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${slug}-oauth-guide.md` });
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CopyButton text={() => window.location.href} label="Copy link" />
      <CopyButton text={markdown} label="Copy Markdown" />
      <CopyButton text={slack} label="Copy for Slack" />
      <button
        type="button"
        onClick={download}
        className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted hover:text-text"
      >
        Download .md
      </button>
    </div>
  );
}
