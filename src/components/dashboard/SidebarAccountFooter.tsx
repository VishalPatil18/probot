"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

import { ModelStatusCard } from "./ModelStatusCard";

interface SidebarAccountFooterProps {
  llmProvider: string | null;
  llmModel: string | null;
  user: { name: string; email: string; initials: string };
  settingsHref: string;
  modelHref: string;
}

export function SidebarAccountFooter({
  llmProvider,
  llmModel,
  user,
  settingsHref,
  modelHref,
}: SidebarAccountFooterProps) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (pending) return;
    setPending(true);
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <>
      <div className="p-3">
        {confirming ? (
          <div
            role="dialog"
            aria-label="Confirm sign out"
            className="rounded-xl border border-border-base bg-white p-3"
          >
            <p className="text-xs font-semibold text-ink">Sign out of ProBot?</p>
            <p className="mt-1 text-[11px] text-muted">
              You&apos;ll need to log back in to access your dashboard.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="flex-1 rounded-lg border border-border-base px-3 py-1.5 text-xs font-semibold hover:bg-neutral-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={pending}
                className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {pending ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        ) : (
          <ModelStatusCard
            provider={llmProvider}
            model={llmModel}
            manageHref={modelHref}
          />
        )}
      </div>

      <div className="border-t border-border-base p-3">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <Link
            href={settingsHref}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg hover:opacity-80"
            aria-label="Account settings"
          >
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-neutral-200 text-xs font-bold">
              {user.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold">{user.name}</p>
              <p className="truncate text-[10px] text-muted">{user.email}</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label="Sign out"
            className="text-muted hover:text-ink"
          >
            <SignOutIcon />
          </button>
        </div>
      </div>
    </>
  );
}

function SignOutIcon() {
  return (
    <svg
      aria-hidden
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
