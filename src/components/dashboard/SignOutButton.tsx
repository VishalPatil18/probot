"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

import { ConfirmDialog } from "./ConfirmDialog";

// Sidebar sign-out trigger. Replaces a plain `<Link href="/api/auth/signout">`
// (which dropped the user on next-auth's separate confirmation page) with a
// design-system-styled `ConfirmDialog` modal. Cancel dismisses; Confirm fires
// the client-side `signOut()` with a `callbackUrl` so the post-logout
// landing is `/login` instead of next-auth's default `/`.
export function SignOutButton() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (pending) return;
    setPending(true);
    // No need to close the dialog first; `signOut` triggers a full
    // navigation to `callbackUrl` which unmounts everything.
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Sign out"
        className="text-muted hover:text-ink"
      >
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
      </button>
      <ConfirmDialog
        open={open}
        title="Sign out of ProBot?"
        body="You'll need to log back in to access your dashboard, bots, and conversations."
        confirmLabel={pending ? "Signing out…" : "Sign out"}
        onConfirm={handleConfirm}
        onCancel={() => (pending ? undefined : setOpen(false))}
      />
    </>
  );
}
