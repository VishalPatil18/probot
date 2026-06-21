"use client";

import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setLoading(false);
      if (!response.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setLoading(false);
      setError("Network error. Please try again.");
    }
  }

  if (submitted) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand/10">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-brand"
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <polyline points="3 7 12 13 21 7" />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight mb-2">
          Check your email
        </h1>
        <p className="text-muted text-sm mb-2 max-w-sm mx-auto">
          If <span className="font-semibold text-base">{email}</span> is
          registered with a password, we&apos;ve sent a reset link.
        </p>
        <p className="text-muted text-sm mb-8 max-w-sm mx-auto">
          The link expires in 1 hour and can be used once.
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

  return (
    <>
      <h1 className="font-display text-3xl font-extrabold tracking-tight mb-1">
        Forgot password?
      </h1>
      <p className="text-muted text-sm mb-8">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="email" className="block text-xs font-semibold mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            placeholder="you@email.com"
            className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand transition-colors"
          />
        </div>

        {error ? (
          <p className="text-xs text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full !py-3"
        >
          <span>{loading ? "Sending…" : "Send reset link"}</span>
        </button>
      </form>

      <p className="text-sm text-muted text-center mt-7">
        Remembered it?{" "}
        <Link href="/login" className="text-brand font-semibold">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
