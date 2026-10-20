"use client";
import { useState } from "react";

export function CopyButton({ text, label = "Copy", className = "" }: { text: string | (() => string); label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(typeof text === "function" ? text() : text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted hover:text-text ${className}`}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
