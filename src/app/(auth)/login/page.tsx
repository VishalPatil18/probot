import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Log in · ProBot",
  description: "Log in to manage your bot and leads.",
};

// LoginForm reads ?verify= and ?reset= via useSearchParams(). In Next.js 14
// any client component reading useSearchParams() at the top of a route must
// be wrapped in <Suspense> so SSG can prerender the shell while the search
// params resolve on the client.
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginFormFallback() {
  return (
    <>
      <h1 className="font-display text-3xl font-extrabold tracking-tight mb-1">
        Welcome back
      </h1>
      <p className="text-muted text-sm mb-8">
        Log in to manage your bot and leads.
      </p>
    </>
  );
}
