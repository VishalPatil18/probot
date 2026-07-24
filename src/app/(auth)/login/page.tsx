import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Log in · ProBot",
  description: "Log in to manage your bot and leads.",
};

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
