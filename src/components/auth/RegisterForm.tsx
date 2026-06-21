"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useDebouncedValue } from "@/lib/client/use-debounced-value";

import { OAuthRow } from "./OAuthRow";
import { PasswordInput } from "./PasswordInput";

interface FieldAvailability {
  available: boolean;
  reason?: string;
}

interface AvailabilityResult {
  username?: FieldAvailability;
  email?: FieldAvailability;
}

type RegisterErrorPayload = {
  error?: string;
  details?: {
    fieldErrors?: Record<string, string[] | undefined>;
    formErrors?: string[];
  };
};

type RegisterSuccessPayload = {
  user: { id: string; username: string; email: string };
  verificationEmailSent: boolean;
};

function firstError(payload: RegisterErrorPayload): string {
  const field = payload.details?.fieldErrors;
  if (field) {
    for (const key of Object.keys(field)) {
      const messages = field[key];
      if (messages && messages.length > 0 && messages[0]) {
        return messages[0];
      }
    }
  }
  const formErrors = payload.details?.formErrors;
  if (formErrors && formErrors.length > 0 && formErrors[0]) {
    return formErrors[0];
  }
  return payload.error ?? "Something went wrong. Please try again.";
}

export function RegisterForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<RegisterSuccessPayload | null>(
    null,
  );

  // Debounced username/email availability check. We only query once the value
  // is plausibly checkable (username ≥ 3 chars, email contains "@") so we don't
  // flag a half-typed field. The register endpoint stays the source of truth -
  // this is a pre-submit hint, not a replacement for the server-side check.
  const debouncedUsername = useDebouncedValue(username, 400);
  const debouncedEmail = useDebouncedValue(email, 400);
  const [availability, setAvailability] = useState<AvailabilityResult>({});
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedUsername.length >= 3) {
      params.set("username", debouncedUsername);
    }
    if (debouncedEmail.includes("@")) {
      params.set("email", debouncedEmail);
    }
    if ([...params.keys()].length === 0) {
      setAvailability({});
      return;
    }
    let cancelled = false;
    setChecking(true);
    fetch(`/api/auth/check-availability?${params.toString()}`)
      .then((response) => (response.ok ? response.json() : {}))
      .then((data: AvailabilityResult) => {
        if (!cancelled) setAvailability(data);
      })
      .catch(() => {
        if (!cancelled) setAvailability({});
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedUsername, debouncedEmail]);

  const usernameTaken = availability.username?.available === false;
  const emailTaken = availability.email?.available === false;
  const submitDisabled = loading || checking || usernameTaken || emailTaken;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    let response: Response;
    try {
      response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
    } catch {
      setLoading(false);
      setError("Network error. Please try again.");
      return;
    }

    if (!response.ok) {
      const payload = (await response
        .json()
        .catch(() => ({}))) as RegisterErrorPayload;
      setLoading(false);
      setError(firstError(payload));
      return;
    }

    const payload = (await response
      .json()
      .catch(() => null)) as RegisterSuccessPayload | null;
    setLoading(false);
    setSubmitted(
      payload ?? {
        user: { id: "", username, email },
        verificationEmailSent: true,
      },
    );
  }

  if (submitted) {
    return <VerificationPendingPanel email={submitted.user.email} />;
  }

  return (
    <>
      <h1 className="font-display text-3xl font-extrabold tracking-tight mb-1">
        Create your account
      </h1>
      <p className="text-muted text-sm mb-8">
        Build your AI assistant in 2 minutes.
      </p>

      <OAuthRow email={email} />

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-border-base" />
        <span className="text-xs text-muted">or with email</span>
        <div className="flex-1 h-px bg-border-base" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="username"
            className="block text-xs font-semibold mb-1.5"
          >
            Username{" "}
            <span className="text-muted font-normal">· your bot URL</span>
          </label>
          <div className="flex items-center border border-border-base rounded-xl overflow-hidden focus-within:border-brand transition-colors">
            <span className="pl-3 pr-1 text-sm text-muted">pro-bot.dev/u/</span>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              minLength={3}
              maxLength={30}
              autoComplete="username"
              placeholder="jane-doe"
              aria-invalid={usernameTaken}
              className="flex-1 py-2.5 pr-3 text-sm outline-none bg-transparent"
            />
          </div>
          {usernameTaken ? (
            <p className="text-[11px] text-red-600 mt-1" role="alert">
              {availability.username?.reason}
            </p>
          ) : (
            <p className="text-[11px] text-muted mt-1">
              3–30 chars · lowercase, numbers, hyphens.
            </p>
          )}
        </div>
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
            aria-invalid={emailTaken}
            className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand transition-colors"
          />
          {emailTaken ? (
            <p className="text-[11px] text-red-600 mt-1" role="alert">
              {availability.email?.reason}
            </p>
          ) : null}
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold mb-1.5"
          >
            Password
          </label>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
        </div>

        {error ? (
          <p className="text-xs text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitDisabled}
          className="btn btn-primary w-full !py-3"
        >
          <span>{loading ? "Creating account…" : "Create account"}</span>
          {loading ? null : <ArrowRightIcon />}
        </button>
      </form>

      <p className="text-sm text-muted text-center mt-7">
        Already have an account?{" "}
        <Link href="/login" className="text-brand font-semibold">
          Log in
        </Link>
      </p>
    </>
  );
}

function VerificationPendingPanel({ email }: { email: string }) {
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
        We sent a verification link to{" "}
        <span className="font-semibold text-base">{email}</span>.
      </p>
      <p className="text-muted text-sm mb-8 max-w-sm mx-auto">
        Click the link to verify your account, then sign in.
      </p>
      <Link
        href="/login"
        className="btn btn-primary !py-3 inline-flex items-center gap-2"
      >
        Back to sign in
      </Link>
      <p className="text-xs text-muted mt-6 max-w-sm mx-auto">
        Didn&apos;t get the email? Check your spam folder. The link expires in
        24 hours.
      </p>
    </div>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
