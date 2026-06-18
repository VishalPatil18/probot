import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Check your email · ProBot",
  description: "We sent you a sign-in link.",
};

export default function VerifyRequestPage() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#2563eb"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <polyline points="22 6 12 13 2 6" />
        </svg>
      </div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight mb-2">
        Check your email
      </h1>
      <p className="text-muted text-sm mb-8 max-w-sm mx-auto">
        We sent a sign-in link to your inbox. Click the link to continue.
        The link expires in 24 hours.
      </p>
      <p className="text-xs text-muted">
        Didn&apos;t get it? Check spam, or{" "}
        <Link href="/login" className="text-brand font-semibold">
          try again
        </Link>
        .
      </p>
    </div>
  );
}
