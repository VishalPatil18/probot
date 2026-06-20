import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import Link from "next/link";

import { ConversationsLineChart } from "@/components/dashboard/ConversationsLineChart";
import { EmbedSnippet } from "@/components/dashboard/EmbedSnippet";
import { MetricTile } from "@/components/dashboard/MetricTile";
import { RecentConversationsList } from "@/components/dashboard/RecentConversationsList";
import { RecentLeadsTable } from "@/components/dashboard/RecentLeadsTable";
import { TopTopicsPlaceholder } from "@/components/dashboard/TopTopicsPlaceholder";
import {
  getAnalyticsForUser,
  getDailyConversationCounts,
} from "@/lib/analytics/queries";
import { authOptions } from "@/lib/auth/auth";
import { bots, db } from "@/lib/db";
import { listRecentConversationsForUser } from "@/lib/conversations/queries";
import { listRecentLeadsForUser } from "@/lib/leads/queries";
import { resolveSelectedBotId } from "@/lib/server/selected-bot";
import { getOrigin } from "@/lib/server/origin";

const EMBED_GUIDE_URL = "https://docs.probot.dev/guides/embed-widget";

// Dashboard home — ported from design/dashboard.html.
//
// Layout chrome (sidebar + topbar) is provided by `(dashboard)/layout.tsx`.
// This page renders the inner content: weekly greeting, 4 metric tiles
// (with Coming Soon pills where the data isn't wired yet), curvy 7-day
// chart + top topics placeholder, recent leads table, recent conversations
// list + share-your-bot card.
//
// First-time users (no bots) see a focused empty-state CTA instead.
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.username) return null;

  const userId = session.user.id;
  const username = session.user.username;

  // The layout already fetches a similar set, but a route boundary won't
  // pass data from layout to page. Re-fetch the few pieces we need here.
  const [ownedBots, analytics, dailyCounts, recentLeads, recentConvos] =
    await Promise.all([
      db
        .select({ id: bots.id, name: bots.name, themeColor: bots.themeColor })
        .from(bots)
        .where(eq(bots.userId, userId)),
      getAnalyticsForUser(userId),
      getDailyConversationCounts({ userId, days: 7 }),
      listRecentLeadsForUser({ userId, limit: 5 }),
      listRecentConversationsForUser({ userId, limit: 3 }),
    ]);

  // Greeting empty state — user has zero bots; collapse the dashboard
  // grid to a focused "create your first bot" CTA.
  if (ownedBots.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 lg:px-8">
        <div className="rounded-2xl border-2 border-dashed border-border-base bg-white p-12 text-center shadow-soft">
          <h2 className="font-display text-2xl font-extrabold">
            Welcome to ProBot 👋
          </h2>
          <p className="mt-2 text-sm text-muted">
            Build your first bot in under a minute — drop in your resume,
            pick a model, share the URL.
          </p>
          <Link
            href="/dashboard/bots/new"
            className="btn btn-primary mt-6 inline-flex"
          >
            Create your first bot
          </Link>
        </div>
      </div>
    );
  }

  const fallbackId = ownedBots[0]?.id ?? null;
  const selectedBotId = resolveSelectedBotId(
    ownedBots.map((b) => b.id),
    fallbackId,
  );
  const selectedBot =
    ownedBots.find((b) => b.id === selectedBotId) ?? ownedBots[0] ?? null;

  const origin = getOrigin();

  // `ownedBots` is already pre-filtered by `eq(bots.userId, userId)` and
  // includes the themeColor column we need for the embed snippet — so
  // `selectedBot` is ownership-verified by construction. No need to
  // re-query for confirmation.

  const firstName = (session.user.name ?? username).split(/\s+/)[0] ?? username;
  const thisWeekConvos = dailyCounts.reduce((sum, d) => sum + d.count, 0);
  const newLeadsThisMonth = analytics.leadsThisMonth;

  return (
    <div className="max-w-[1100px] px-6 py-8 lg:px-8">
      {/* greeting */}
      <div className="mb-8">
        <h2 className="font-display text-2xl font-extrabold tracking-tight">
          Welcome back, {firstName} 👋
        </h2>
        <p className="mt-1 text-sm text-muted">
          Your bot answered{" "}
          <strong className="text-ink">
            {thisWeekConvos} {thisWeekConvos === 1 ? "conversation" : "conversations"}
          </strong>{" "}
          this week
          {newLeadsThisMonth > 0 ? (
            <>
              {" "}
              and captured{" "}
              <strong className="text-brand">
                {newLeadsThisMonth} new{" "}
                {newLeadsThisMonth === 1 ? "lead" : "leads"}
              </strong>{" "}
              this month
            </>
          ) : null}
          .
        </p>
      </div>

      {/* metric tiles */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricTile
          label="Total conversations"
          value={analytics.totalConversations}
          icon="forum"
          fadedGrowth="+18%"
        />
        <MetricTile
          label="Total messages"
          value={analytics.totalMessages}
          icon="chat"
          fadedGrowth="+24%"
        />
        <MetricTile
          label="Leads captured"
          value={analytics.totalLeads}
          icon="contact_mail"
          fadedGrowth="+3 new"
        />
        <MetricTile
          label="Response time"
          value="1.4s"
          icon="bolt"
          comingSoon
        />
      </div>

      {/* chart + topics */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border-base bg-white p-6 shadow-soft lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-bold">Conversations</h3>
              <p className="text-xs text-muted">Last 7 days</p>
            </div>
          </div>
          <ConversationsLineChart data={dailyCounts} />
        </div>
        <TopTopicsPlaceholder />
      </div>

      {/* leads table */}
      <RecentLeadsTable leads={recentLeads} />

      {/* conversations + share */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <RecentConversationsList
          conversations={recentConvos}
          totalCount={analytics.totalConversations}
        />

        <div className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
          <h3 className="mb-1 font-bold">Share your bot</h3>
          <p className="mb-4 text-xs text-muted">
            Add it anywhere recruiters find you.
          </p>
          {selectedBot ? (
            <EmbedSnippet
              botId={selectedBot.id}
              username={username}
              themeColor={selectedBot.themeColor}
              origin={origin}
            />
          ) : (
            <p className="text-sm text-muted">No bot selected.</p>
          )}
          <a
            href={EMBED_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block rounded-lg py-2 text-center text-sm font-semibold text-brand transition-colors hover:bg-blue-50"
          >
            Full embed guide →
          </a>
        </div>
      </div>

    </div>
  );
}
