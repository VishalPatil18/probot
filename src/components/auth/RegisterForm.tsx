"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { OAuthDisabledRow } from "./OAuthDisabledRow";

type RegisterErrorPayload = {
  error?: string;
  details?: {
    fieldErrors?: Record<string, string[] | undefined>;
    formErrors?: string[];
  };
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
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    // Auto sign-in with the same credentials so the user lands in /dashboard
    // without typing their password twice.
    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (!signInResult || signInResult.error) {
      setError("Account created — please log in.");
      router.push("/login");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <h1 className="font-display text-3xl font-extrabold tracking-tight mb-1">
        Create your account
      </h1>
      <p className="text-muted text-sm mb-8">
        Build your AI recruiter in 2 minutes.
      </p>

      <OAuthDisabledRow />

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
            <span className="pl-3 pr-1 text-sm text-muted">probot.com/u/</span>
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
              className="flex-1 py-2.5 pr-3 text-sm outline-none bg-transparent"
            />
          </div>
          <p className="text-[11px] text-muted mt-1">
            3–30 chars · lowercase, numbers, hyphens.
          </p>
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
            className="w-full py-2.5 px-3 text-sm border border-border-base rounded-xl outline-none focus:border-brand transition-colors"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold mb-1.5"
          >
            Password
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
