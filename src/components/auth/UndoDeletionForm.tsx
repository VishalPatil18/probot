"use client";

import Link from "next/link";
import { useState } from "react";

interface Props {
  token: string;
}

export function UndoDeletionForm({ token }: Props) {
  const [typedUsername, setTypedUsername] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "ok" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return <MissingTokenPanel />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/users/me/undo-deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, identifier: typedUsername }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setStatus("error");
        setError(
          body.error === "username_mismatch"
            ? "That didn't match your username or email. Type one exactly as you registered."
            : body.error === "already_purged"
              ? "Too late - the 7-day grace period has elapsed and your account is gone. We're sorry."
              : body.error === "not_found"
                ? "This link is invalid or has already been used."
                : "Couldn't cancel the deletion. Please try again.",
        );
        return;
      }
      setStatus("ok");
    } catch {
      setStatus("error");
      setError("Network error. Please try again.");
    }
  }

  if (status === "ok") {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#059669"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight mb-2">
          Deletion cancelled
        </h1>
        <p className="text-muted text-sm mb-8 max-w-sm mx-auto">
          Welcome back. Your account and all your bots, knowledge, and
          conversations are safe.
        </p>
        <Link
          href="/login"
          className="btn btn-primary !py-3 inline-flex items-center gap-2"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="font-display text-3xl font-extrabold tracking-tight mb-1">
        Restore your account?
      </h1>
      <p className="text-muted text-sm mb-6">
        Type your username or email to confirm you want to cancel the
        scheduled deletion. This brings your account, bots, and data back to
        normal immediately.
      </p>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="undo-username"
            className="block text-xs font-semibold mb-1.5"
          >
            Username or email
          </label>
          <input
            id="undo-username"
            type="text"
            value={typedUsername}
            onChange={(e) => setTypedUsername(e.target.value)}
            placeholder="your-username or you@example.com"
            autoComplete="off"
            autoFocus
            required
            className="w-full py-2.5 px-3 text-sm font-mono border border-border-base rounded-xl outline-none focus:border-brand transition-colors"
          />
        </div>

        {error ? (
          <p className="text-xs text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={status === "submitting" || typedUsername.length === 0}
          className="btn btn-primary w-full !py-3"
        >
          {status === "submitting"
            ? "Cancelling deletion…"
            : "Restore my account"}
        </button>
      </form>

      <p className="text-sm text-muted text-center mt-7">
        Changed your mind?{" "}
        <Link href="/login" className="text-brand font-semibold">
          Back to sign in
        </Link>
      </p>
    </>
  );
}

function MissingTokenPanel() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#dc2626"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight mb-2">
        Undo link missing
      </h1>
      <p className="text-muted text-sm mb-8 max-w-sm mx-auto">
        Open this page from the link in the deletion-scheduled email we
        sent you. If you can&apos;t find it, sign in and use the dashboard
        to check whether a deletion is still pending.
      </p>
      <Link
        href="/login"
        className="btn btn-primary !py-3 inline-flex items-center gap-2"
      >
        Back to sign in
      </Link>
    </div>
  );
}
