"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { ForgotPasswordModal } from "./ForgotPasswordModal";
import { OAuthRow } from "./OAuthRow";
import { PasswordInput } from "./PasswordInput";

const VERIFY_MESSAGES: Record<string, { tone: "ok" | "warn"; text: string }> = {
  ok: {
    tone: "ok",
    text: "Email verified. You can sign in now.",
  },
  expired: {
    tone: "warn",
    text: "That verification link expired. Register again or request a new email.",
  },
  invalid: {
    tone: "warn",
    text: "That verification link is invalid or already used.",
  },
};

const NEXTAUTH_ERROR_MESSAGES: Record<string, string> = {
  email_not_verified:
    "Please verify your email before signing in. Check your inbox for the verification link.",
  CredentialsSignin: "Invalid email or password.",
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verifyCode = searchParams.get("verify") ?? "";
  const resetCode = searchParams.get("reset") ?? "";
  const initialError = searchParams.get("error") ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError && NEXTAUTH_ERROR_MESSAGES[initialError]
      ? NEXTAUTH_ERROR_MESSAGES[initialError]!
      : null,
  );
  const [loading, setLoading] = useState(false);

  const verifyBanner = VERIFY_MESSAGES[verifyCode];
  const resetBanner =
    resetCode === "ok"
      ? "Password updated. Sign in with your new password."
      : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      remember: remember ? "true" : "false",
      redirect: false,
    });
    setLoading(false);
    if (!result || result.error) {
      const code = result?.error ?? "";
      setError(
        NEXTAUTH_ERROR_MESSAGES[code] ?? "Invalid email or password.",
      );
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
      <p className="text-muted text-sm mb-6">
        Log in to manage your bot and leads.
      </p>

      {verifyBanner ? (
        <div
          role="status"
          className={`mb-4 rounded-lg border px-3 py-2 text-xs ${
            verifyBanner.tone === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {verifyBanner.text}
        </div>
      ) : null}
      {resetBanner ? (
        <div
          role="status"
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"
        >
          {resetBanner}
        </div>
      ) : null}

      <OAuthRow email={email} />

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
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="text-xs text-brand font-semibold hover:underline"
            >
              Forgot?
            </button>
          </div>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-muted select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="h-4 w-4 rounded border-border-base text-brand focus:ring-brand"
          />
          Keep me signed in
        </label>

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

      <ForgotPasswordModal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        initialEmail={email}
      />
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
