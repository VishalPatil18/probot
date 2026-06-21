"use client";

import { useState } from "react";

type Status = "prompt" | "submitting" | "captured";

type Props = {
  botId: string;
  botName: string;
  conversationId: string | null;
  contextSummary: string;
  onDismiss: () => void;
  onCaptured: () => void;
};

const SAFE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// In-chat lead-capture card. Shown after the 3rd assistant
// reply. Email validation mirrors the server-side Zod check; on Submit
// POSTs to /api/bots/[botId]/leads with the conversationId (when
// available) so the server can mark the conversation's recruiter_email
// and create a notification atomically. On Skip, the parent persists
// "dismissed" status so the card never reappears in this conversation.
//
// After Submit, the card switches to an inline "Thanks!" confirmation
// that stays in the message stream rather than disappearing - the
// recruiter sees the closure of the loop.
export function LeadCaptureCard({
  botId,
  botName,
  conversationId,
  contextSummary,
  onDismiss,
  onCaptured,
}: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("prompt");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!SAFE_EMAIL.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);
    setStatus("submitting");
    try {
      const res = await fetch(`/api/bots/${botId}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          conversationId: conversationId ?? undefined,
          contextSummary,
        }),
      });
      if (!res.ok) {
        setStatus("prompt");
        setError("Something went wrong. Please try again.");
        return;
      }
      setStatus("captured");
      onCaptured();
    } catch {
      setStatus("prompt");
      setError("Network error. Please try again.");
    }
  }

  if (status === "captured") {
    return (
      <div
        role="status"
        className="mx-auto w-full max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-center text-sm text-emerald-900 shadow-soft"
      >
        Thanks! {botName} will be in touch.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-md rounded-2xl border border-border-base bg-white px-5 py-4 shadow-soft"
    >
      <p className="text-sm font-semibold text-text-base">
        Want {botName} to get back to you?
      </p>
      <p className="mt-1 text-xs text-muted">
        Leave your email and {botName} will follow up.
      </p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        aria-label="Email address"
        disabled={status === "submitting"}
        className="mt-3 w-full rounded-xl border border-border-base px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
      />
      {error ? (
        <p role="alert" className="mt-2 text-xs text-rose-600">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onDismiss}
          disabled={status === "submitting"}
          className="rounded-xl border border-border-base bg-white px-3 py-1.5 text-xs font-semibold text-text-base hover:bg-gray-50 disabled:opacity-60"
        >
          Skip
        </button>
        <button
          type="submit"
          disabled={status === "submitting" || email.trim().length === 0}
          className="rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand/90 disabled:opacity-60"
        >
          {status === "submitting" ? "Sending…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
