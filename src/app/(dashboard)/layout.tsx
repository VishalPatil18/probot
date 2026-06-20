import { desc, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import {
  MobileSidebarPanel,
  MobileSidebarProvider,
} from "@/components/dashboard/MobileSidebar";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { getAnalyticsForUser } from "@/lib/analytics/queries";
import { authOptions } from "@/lib/auth/auth";
import { bots, db, users } from "@/lib/db";
import { resolveSelectedBotId } from "@/lib/server/selected-bot";
import { getOrigin } from "@/lib/server/origin";
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
// Slice A redesign: the layout now wraps every dashboard page in the
// sidebar + topbar shell that mirrors design/dashboard.html. The
// selected bot id rides a per-browser cookie so the URL pill, embed
// snippet, and "View live bot" surfaces stay consistent as the user
// navigates between pages.
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

  const userId = session.user.id;
  const username = session.user.username;

  const [ownedBots, analytics, userRow] = await Promise.all([
    db
      .select({ id: bots.id, name: bots.name, updatedAt: bots.updatedAt })
      .from(bots)
      .where(eq(bots.userId, userId))
      .orderBy(desc(bots.updatedAt)),
    getAnalyticsForUser(userId),
    db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { llmProvider: true, llmModel: true },
    }),
  ]);

  const botList = ownedBots.map((b) => ({ id: b.id, name: b.name }));
  const fallbackId = botList[0]?.id ?? null;
  const selectedBotId = resolveSelectedBotId(
    botList.map((b) => b.id),
    fallbackId,
  );
  const selectedBot = botList.find((b) => b.id === selectedBotId) ?? null;
  const selectedBotName = selectedBot?.name ?? username;

  const origin = getOrigin();
  const publicUrl = `${origin}/u/${username}/chat`;

  const userName = session.user.name ?? username;
  const userEmail = session.user.email ?? "";
  const initials = computeInitials(userName);

  const sidebarProps = {
    bots: botList,
    selectedBotId,
    selectedBotName,
    publicUrl,
    counts: {
      conversations: analytics.totalConversations,
      leads: analytics.totalLeads,
    },
    user: { name: userName, email: userEmail, initials },
    llmProvider: userRow?.llmProvider ?? null,
    llmModel: userRow?.llmModel ?? null,
  };

  return (
    <MobileSidebarProvider>
      <div className="flex min-h-screen bg-bg-app text-ink">
        <aside className="fixed hidden h-screen w-64 shrink-0 border-r border-border-base bg-white lg:flex lg:flex-col">
          <Sidebar {...sidebarProps} />
        </aside>

        <div className="flex-1 lg:ml-64">
          <Topbar
            publicUrl={selectedBotId ? publicUrl : null}
            liveBotUrl={selectedBotId ? publicUrl : null}
          />
          <main>{children}</main>
        </div>

        <MobileSidebarPanel>
          <Sidebar {...sidebarProps} />
        </MobileSidebarPanel>
      </div>
    </MobileSidebarProvider>
  );
}

function computeInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}
