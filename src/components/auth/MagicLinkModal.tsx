"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";

interface MagicLinkModalProps {
  open: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export function MagicLinkModal({
  open,
  onClose,
  initialEmail = "",
}: MagicLinkModalProps) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

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
    if (!email || !email.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    setError(null);
    setLoading(true);
    const result = await signIn("email", {
      email,
      callbackUrl: "/dashboard",
      redirect: false,
    });
    setLoading(false);
    if (!result || result.error) {
      setError("Could not send the link. Please try again.");
      return;
    }
    setSent(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="magic-modal-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h2
            id="magic-modal-title"
            className="font-display text-xl font-extrabold tracking-tight"
          >
            {sent ? "Check your email" : "Sign in with a magic link"}
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
            We&apos;ve sent a sign-in link to{" "}
            <span className="font-semibold text-brand">{email}</span>. Click the
            link in that email to log in.
          </p>
        ) : (
          <>
            <p className="text-muted text-sm mb-5">
              Enter your email and we&apos;ll send you a one-tap sign-in link.
            </p>
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div>
                <label
                  htmlFor="magic-email"
                  className="block text-xs font-semibold mb-1.5"
                >
                  Email
                </label>
                <input
                  id="magic-email"
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
                <span>{loading ? "Sending…" : "Send magic link"}</span>
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
