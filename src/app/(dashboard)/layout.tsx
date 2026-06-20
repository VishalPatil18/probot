import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { authOptions } from "@/lib/auth/auth";
import { isPlaceholderUsername } from "@/lib/users/placeholder";

interface DashboardLayoutProps {
  children: ReactNode;
}

// Stage 4 plan.md §4: every dashboard surface is gated behind a "real
// username" check. OAuth and magic-link sign-ups land with a
// `user-<8hex>` placeholder; we shunt them through /onboarding before any
// dashboard page renders so public chat URLs (/u/<username>/chat) never
// expose the throwaway slug.
//
// Auth check also lives here so individual dashboard pages don't have to
// duplicate it. Unauthenticated users go to /login with a `next` param so
// they return here after sign-in.
export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.username) {
    redirect("/login?next=/dashboard");
  }
  if (isPlaceholderUsername(session.user.username)) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
        <span className="text-sm font-semibold">ProBot</span>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <a
            href="https://docs.probot.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Docs
          </a>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
