import Link from "next/link";

import { BrandPanel } from "@/components/auth/BrandPanel";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid lg:grid-cols-2 min-h-screen">
      <BrandPanel />
      <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-10">
        <div className="w-full max-w-sm mx-auto">
          <Link
            href="/"
            className="lg:hidden flex items-center gap-2.5 mb-8"
            aria-label="ProBot home"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 40 40"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="20" cy="20" r="16" fill="oklch(0.55 0.193 251.78)" />
              <circle cx="14" cy="20" r="3.4" fill="#fff" />
              <circle cx="26" cy="20" r="3.4" fill="#fff" opacity="0.65" />
            </svg>
            <span className="font-display text-xl font-extrabold tracking-tight">
              ProBot
            </span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
