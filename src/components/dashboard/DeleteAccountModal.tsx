"use client";

import { useEffect, useId, useState } from "react";

// GitHub-style "type your username to confirm" account-deletion modal.
// Two text inputs: the user must type their username AND the literal
// phrase "delete my account" before the destructive button enables.
// Both safeguards together make accidental tap-and-confirm essentially
// impossible.
//
// The component is presentational - it doesn't fire the API call itself.
// The parent passes `onConfirm(username)` and renders status from there.
// Keeps this modal reusable for the bot-delete flow (which uses a sister
// modal with different copy + a different action).

const CONFIRM_PHRASE = "delete my account";

interface Props {
  username: string;
  open: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (typedUsername: string) => void;
}

export function DeleteAccountModal({
  username,
  open,
  busy,
  error,
  onClose,
  onConfirm,
}: Props) {
  const usernameId = useId();
  const phraseId = useId();
  const [typedUsername, setTypedUsername] = useState("");
  const [typedPhrase, setTypedPhrase] = useState("");

  // Reset the inputs every time the modal opens. Lingering text from a
  // previous open would let a user click Confirm without actually typing
  // anything in the new session.
  useEffect(() => {
    if (open) {
      setTypedUsername("");
      setTypedPhrase("");
    }
  }, [open]);

  // Allow Esc to close while not busy. We deliberately do NOT close on
  // backdrop click; deletion confirmations should require an explicit
  // exit because an off-click is too easy to do by accident.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const usernameOk = typedUsername === username;
  const phraseOk = typedPhrase.trim().toLowerCase() === CONFIRM_PHRASE;
  const enabled = usernameOk && phraseOk && !busy;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-floating">
        <h2
          id="delete-account-title"
          className="font-display text-xl font-extrabold text-rose-600"
        >
          Delete your account
        </h2>
        <p className="mt-2 text-sm text-muted">
          This schedules permanent deletion in <strong>7 days</strong>. You
          can undo via the email we&apos;ll send, or from this page, any time
          before then.
        </p>

        <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
          What gets deleted: your account, all bots, knowledge bases,
          conversations, leads, encrypted keys, and audit logs.{" "}
          <strong>This cannot be reversed after 7 days.</strong>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label
              htmlFor={usernameId}
              className="mb-1.5 block text-xs font-semibold"
            >
              Type your username{" "}
              <span className="font-mono text-muted">({username})</span> to
              confirm
            </label>
            <input
              id={usernameId}
              type="text"
              value={typedUsername}
              onChange={(e) => setTypedUsername(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl border border-border-base bg-white px-3 py-2.5 text-sm font-mono outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
            />
          </div>
          <div>
            <label
              htmlFor={phraseId}
              className="mb-1.5 block text-xs font-semibold"
            >
              Type{" "}
              <span className="font-mono text-muted">
                &ldquo;{CONFIRM_PHRASE}&rdquo;
              </span>{" "}
              to confirm
            </label>
            <input
              id={phraseId}
              type="text"
              value={typedPhrase}
              onChange={(e) => setTypedPhrase(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl border border-border-base bg-white px-3 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
            />
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-xs text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(typedUsername)}
            disabled={!enabled}
            className="btn border border-rose-200 !bg-rose-600 !text-white hover:!bg-rose-700 disabled:opacity-50"
          >
            {busy ? "Scheduling…" : "Delete my account"}
          </button>
        </div>
      </div>
    </div>
  );
}
