"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

import { DeleteAccountModal } from "../DeleteAccountModal";

interface Props {
  username: string;
  pendingDeletion: { scheduledPurgeAt: string } | null;
}

// Client island that holds the destructive actions on the
// Security tab. Renders one of three states:
//   1. No pending deletion → "Delete account" button → opens the modal.
//   2. Pending deletion → banner with countdown + "Undo deletion" link to
//      the email-driven undo page. (The dashboard doesn't expose its own
//      undo button because the typed-username re-check belongs on the
//      undo-page form, which we want to be the one canonical surface.)
//   3. Modal open → DeleteAccountModal renders.

export function SecurityActions({ username, pendingDeletion }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm(typedUsername: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/users/me/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: typedUsername }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(
          body.error === "username_mismatch"
            ? "Username didn't match. Type it exactly."
            : body.error === "already_requested"
              ? "A deletion is already scheduled. Check your email for the undo link."
              : "Couldn't schedule deletion. Please try again.",
        );
        return;
      }
      // Sign the user out so the next request doesn't render a stale
      // session pointing at an account the user just scheduled for
      // deletion. They can still log in during the grace period to undo.
      await signOut({ callbackUrl: "/login?deletion=scheduled" });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (pendingDeletion) {
    const purgeDate = new Date(pendingDeletion.scheduledPurgeAt);
    const daysLeft = Math.max(
      0,
      Math.ceil((purgeDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
    );
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h3 className="font-bold text-amber-900">
          Account scheduled for deletion
        </h3>
        <p className="mt-2 text-sm text-amber-900/80">
          Your account and all data will be permanently deleted on{" "}
          <strong>{purgeDate.toUTCString()}</strong> ({daysLeft}{" "}
          {daysLeft === 1 ? "day" : "days"} from now).
        </p>
        <p className="mt-2 text-sm text-amber-900/80">
          To cancel, open the &ldquo;Undo deletion&rdquo; link in the email
          we sent you. You&apos;ll need to confirm your username on that
          page.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-2xl border border-rose-200 bg-white p-6 shadow-soft">
        <h3 className="mb-1 font-bold text-rose-600">Danger zone</h3>
        <p className="mb-4 text-xs text-muted">
          Schedules permanent deletion of your account, all bots, knowledge
          bases, conversations, and leads after a 7-day grace period. You
          can undo via email during that window.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn border border-rose-200 !bg-rose-50 !text-rose-600 hover:!bg-rose-100"
        >
          Delete account
        </button>
      </section>

      <DeleteAccountModal
        username={username}
        open={open}
        busy={busy}
        error={error}
        onClose={() => {
          setOpen(false);
          setError(null);
        }}
        onConfirm={handleConfirm}
      />
    </>
  );
}
