import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign-in error · ProBot",
  description: "Something went wrong signing you in.",
};

const ERROR_MESSAGES: Record<string, string> = {
  Verification:
    "That sign-in link has expired or was already used. Request a new one.",
  AccessDenied: "Access denied. Try a different sign-in method.",
  OAuthAccountNotLinked:
    "This email is already linked to another sign-in method. Sign in with that method first.",
  CredentialsSignin: "Invalid email or password.",
};

interface PageProps {
  searchParams: { error?: string };
}

export default function AuthErrorPage({ searchParams }: PageProps) {
  const code = searchParams.error ?? "";
  const message =
    ERROR_MESSAGES[code] ?? "Something went wrong. Please try again.";

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
        Sign-in error
      </h1>
      <p className="text-muted text-sm mb-8 max-w-sm mx-auto">{message}</p>
      <Link
        href="/login"
        className="btn btn-primary !py-3 inline-flex items-center gap-2"
      >
        Back to sign in
      </Link>
    </div>
  );
}
