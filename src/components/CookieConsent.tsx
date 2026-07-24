"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "probot.cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== "accepted") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
    }
    setVisible(false);
  }

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-4 border-t border-white/10 bg-ink px-4 py-3 text-sm text-white/90 sm:px-6 lg:px-8"
    >
      <p className="min-w-0 flex-1 leading-relaxed">
        We use cookies to improve your experience and understand site usage. By
        continuing, you agree to our{" "}
        <Link href="/privacy" className="underline hover:text-white">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/terms" className="underline hover:text-white">
          Terms of Service
        </Link>
        .
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss cookie banner"
          className="grid size-8 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
