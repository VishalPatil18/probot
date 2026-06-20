"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return <InvalidLinkPanel />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      setLoading(false);
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(payload.error ?? "Something went wrong. Please try again.");
        return;
      }
      router.push("/login?reset=ok");
    } catch {
      setLoading(false);
      setError("Network error. Please try again.");
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-extrabold tracking-tight mb-1">
        Choose a new password
      </h1>
      <p className="text-muted text-sm mb-8">
        Pick something at least 8 characters long.
      </p>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold mb-1.5"
          >
            New password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand transition-colors"
          />
        </div>
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-xs font-semibold mb-1.5"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Re-enter your new password"
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
          <span>{loading ? "Saving…" : "Update password"}</span>
        </button>
      </form>
    </>
  );
}

function InvalidLinkPanel() {
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
        Reset link missing
      </h1>
      <p className="text-muted text-sm mb-8 max-w-sm mx-auto">
        Open this page from the link in your password-reset email, or request a
        new link.
      </p>
      <Link
        href="/forgot-password"
        className="btn btn-primary !py-3 inline-flex items-center gap-2"
      >
        Request a new link
      </Link>
    </div>
  );
}
