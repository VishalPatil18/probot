"use client";

import { useState } from "react";

// Stage 4: shared copy-to-clipboard button used by:
//   - Bot Factory Step 5 (post-creation success screen)
//   - Dashboard home (per-bot list item)
// Shows transient "Copied!" feedback for 1.5s. Falls back to displaying the
// URL if clipboard API is unavailable (older browsers, insecure contexts).

type Props = {
  url: string;
  label?: string;
  className?: string;
};

export function CopyUrlButton({ url, label = "Copy link", className }: Props) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  async function copy() {
    try {
      if (!navigator.clipboard) {
        setError(true);
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setError(false);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError(true);
    }
  }

  const text = copied ? "Copied!" : error ? "Copy failed" : label;
  return (
    <button
      type="button"
      onClick={copy}
      // Accessible name reflects BOTH the current state (Copy link / Copied! /
      // Copy failed) AND the URL for screen-reader users. Dynamic so tests
      // can findByRole on the visible state.
      aria-label={`${text}: ${url}`}
      className={
        className ??
        "rounded-xl border border-border-base bg-white px-3 py-2 text-xs font-semibold hover:bg-neutral-50"
      }
    >
      {text}
    </button>
  );
}
