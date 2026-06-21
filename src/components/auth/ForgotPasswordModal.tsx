"use client";

import { useEffect, useState } from "react";

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
  initialEmail?: string;
}

// Forgot-password flow as an in-place modal, opened from the login form's
// "Forgot?" link. Same POST /api/auth/forgot-password call as the standalone
// /forgot-password page (kept as a deep-link fallback). Closes on backdrop
// click, the × button, or Escape; resets its internal state each time it opens.
export function ForgotPasswordModal({
  open,
  onClose,
  initialEmail = "",
}: ForgotPasswordModalProps) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // Reset to a clean form whenever the modal is (re)opened, seeding the email
  // the user already typed on the login form.
  useEffect(() => {
    if (open) {
      setEmail(initialEmail);
      setError(null);
      setLoading(false);
      setSent(false);
    }
  }, [open, initialEmail]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

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
      setSent(true);
    } catch {
      setLoading(false);
      setError("Network error. Please try again.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgot-modal-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h2
            id="forgot-modal-title"
            className="font-display text-xl font-extrabold tracking-tight"
          >
            {sent ? "Check your email" : "Forgot password?"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-ink -mt-1 -mr-1 p-1"
          >
            <CloseIcon />
          </button>
        </div>

        {sent ? (
          <p className="text-muted text-sm">
            If <span className="font-semibold text-base">{email}</span> is
            registered with a password, we&apos;ve sent a reset link. It expires
            in 1 hour and can be used once.
          </p>
        ) : (
          <>
            <p className="text-muted text-sm mb-5">
              Enter your email and we&apos;ll send you a reset link.
            </p>
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-semibold mb-1.5"
                >
                  Email
                </label>
                <input
                  id="forgot-email"
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
          </>
        )}
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
