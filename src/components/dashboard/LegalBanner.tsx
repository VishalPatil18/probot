"use client";

import { useState } from "react";

import { LEGAL_EFFECTIVE_DATE } from "@/lib/marketing/legal";

export function LegalBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  async function acknowledge() {
    setDismissed(true);
    try {
      await fetch("/api/users/me/legal-ack", { method: "POST" });
    } catch {
    }
  }

  return (
    <div
      role="region"
      aria-label="Terms update"
      className="flex items-start justify-between gap-4 border-b border-amber-200 bg-amber-50 px-6 py-3 lg:px-8"
    >
      <p className="text-sm text-amber-900">
        <span className="font-semibold">We updated our Terms &amp; Privacy</span>{" "}
        (effective {LEGAL_EFFECTIVE_DATE}). By continuing to use ProBot you
        accept the latest version.{" "}
        <a href="/terms" className="font-semibold underline">
          Review the terms
        </a>
        .
      </p>
      <button
        type="button"
        onClick={() => void acknowledge()}
        className="shrink-0 rounded-lg border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
      >
        Got it
      </button>
    </div>
  );
}
