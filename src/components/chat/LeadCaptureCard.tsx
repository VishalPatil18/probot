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

export function LeadCaptureCard({
  botId,
  botName,
  conversationId,
  contextSummary,
  onDismiss,
  onCaptured,
}: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [status, setStatus] = useState<Status>("prompt");
  const [error, setError] = useState<string | null>(null);

  const requiredFilled =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    company.trim().length > 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (name.trim().length === 0) {
      setError("Please enter your name.");
      return;
    }
    if (!SAFE_EMAIL.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (company.trim().length === 0) {
      setError("Please enter your company.");
      return;
    }
    setError(null);
    setStatus("submitting");
    try {
      const res = await fetch(`/api/bots/${botId}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: trimmedEmail,
          company: company.trim(),
          linkedinUrl: linkedinUrl.trim() || undefined,
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
        Share your details and {botName} will follow up.
      </p>
      <div className="mt-3 space-y-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          aria-label="Your name"
          disabled={status === "submitting"}
          className="w-full rounded-xl border border-border-base px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          aria-label="Email address"
          disabled={status === "submitting"}
          className="w-full rounded-xl border border-border-base px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
        />
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company"
          aria-label="Company"
          disabled={status === "submitting"}
          className="w-full rounded-xl border border-border-base px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
        />
        <input
          type="url"
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          placeholder="LinkedIn URL (optional)"
          aria-label="LinkedIn URL (optional)"
          disabled={status === "submitting"}
          className="w-full rounded-xl border border-border-base px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
        />
      </div>
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
          disabled={status === "submitting" || !requiredFilled}
          className="rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand/90 disabled:opacity-60"
        >
          {status === "submitting" ? "Sending…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
