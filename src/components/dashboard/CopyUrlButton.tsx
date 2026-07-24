"use client";

import { useState } from "react";

type Props = {
  url: string;
  label?: string;
  className?: string;
  iconOnly?: boolean;
};

function CopyIcon() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function CopyUrlButton({
  url,
  label = "Copy link",
  className,
  iconOnly = false,
}: Props) {
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
      aria-label={`${text}: ${url}`}
      title={text}
      className={
        className ??
        "rounded-xl border border-border-base bg-white px-3 py-2 text-xs font-semibold hover:bg-neutral-50"
      }
    >
      {iconOnly ? copied ? <CheckIcon /> : <CopyIcon /> : text}
    </button>
  );
}
