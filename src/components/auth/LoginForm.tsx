"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { OAuthDisabledRow } from "./OAuthDisabledRow";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (!result || result.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <h1 className="font-display text-3xl font-extrabold tracking-tight mb-1">
        Welcome back
      </h1>
      <p className="text-muted text-sm mb-8">
        Log in to manage your bot and leads.
      </p>

      <OAuthDisabledRow />

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-border-base" />
        <span className="text-xs text-muted">or with email</span>
        <div className="flex-1 h-px bg-border-base" />
      </div>

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
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="text-xs font-semibold">
              Password
            </label>
            <span
              className="text-xs text-muted opacity-50 cursor-not-allowed select-none"
              title="Password reset arrives in Stage 7"
            >
              Forgot?
            </span>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
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
          <span>{loading ? "Logging in…" : "Log in"}</span>
          {loading ? null : <ArrowRightIcon />}
        </button>
      </form>

      <p className="text-sm text-muted text-center mt-7">
        New to ProBot?{" "}
        <Link href="/register" className="text-brand font-semibold">
          Create an account
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
