"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

// Thin client-component wrapper so the root server layout can mount
// NextAuth's SessionProvider without itself becoming a client component.
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
