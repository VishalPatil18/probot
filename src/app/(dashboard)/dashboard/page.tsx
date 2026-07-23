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
  formatGrowth,
  getAnalyticsForUser,
  getDailyConversationCounts,
} from "@/lib/analytics/queries";
import { authOptions } from "@/lib/auth/auth";
import { bots, db, encryptedLlmKeys, users } from "@/lib/db";
import { listRecentConversationsForUser } from "@/lib/conversations/queries";
import { listRecentLeadsForUser } from "@/lib/leads/queries";
import { resolveSelectedBotId } from "@/lib/server/selected-bot";
import { getOrigin } from "@/lib/server/origin";

const EMBED_GUIDE_URL = "https://pro-bot.dev/docs/embed-share";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.username) return null;

  const userId = session.user.id;
  const username = session.user.username;

  const [ownedBots, analytics, dailyCounts, recentLeads, recentConvos] =
    await Promise.all([
      db
        .select({ id: bots.id, name: bots.name, themeColor: bots.themeColor })
        .from(bots)
        .where(eq(bots.userId, userId)),
      getAnalyticsForUser(userId),
      getDailyConversationCounts({ userId, days: 7 }),
      listRecentLeadsForUser({ userId, limit: 5 }),
      listRecentConversationsForUser({ userId, limit: 5 }),
    ]);

  if (ownedBots.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 lg:px-8">
        <div className="rounded-2xl border-2 border-dashed border-border-base bg-white p-12 text-center shadow-soft">
          <h2 className="font-display text-2xl font-extrabold">
            Welcome to ProBot 👋
          </h2>
          <p className="mt-2 text-sm text-muted">
            Build your first bot in under a minute - drop in your resume, pick a
            model, share the URL.
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

  let embedNeedsKeySetup = false;
  if (selectedBot) {
    const [ownerRow, storedKey] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { llmProvider: true },
      }),
      db.query.encryptedLlmKeys.findFirst({
        where: eq(encryptedLlmKeys.botId, selectedBot.id),
        columns: { botId: true, azureEndpoint: true },
      }),
    ]);
    embedNeedsKeySetup =
      !storedKey ||
      (ownerRow?.llmProvider === "azure" && !storedKey.azureEndpoint);
  }

  const firstName = (session.user.name ?? username).split(/\s+/)[0] ?? username;
  const thisWeekConvos = dailyCounts.reduce((sum, d) => sum + d.count, 0);
  const newLeadsThisMonth = analytics.leadsThisMonth;

  return (
    <div className="max-w-[1100px] px-6 py-8 lg:px-8">
      <div className="mb-8">
        <h2 className="font-display text-2xl font-extrabold tracking-tight">
          Welcome back, {firstName} 👋
        </h2>
        <p className="mt-1 text-sm text-muted">
          Your bot answered{" "}
          <strong className="text-ink">
            {thisWeekConvos}{" "}
            {thisWeekConvos === 1 ? "conversation" : "conversations"}
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

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricTile
          label="Total conversations"
          value={analytics.totalConversations}
          icon="forum"
          fadedGrowth={
            formatGrowth(
              analytics.conversationsThisWeek,
              analytics.conversationsPrevWeek,
            ) ?? undefined
          }
        />
        <MetricTile
          label="Total messages"
          value={analytics.totalMessages}
          icon="chat"
          fadedGrowth={
            formatGrowth(
              analytics.messagesThisWeek,
              analytics.messagesPrevWeek,
            ) ?? undefined
          }
        />
        <MetricTile
          label="Leads captured"
          value={analytics.totalLeads}
          icon="contact_mail"
          fadedGrowth={
            formatGrowth(analytics.leadsThisMonth, analytics.leadsPrevMonth) ??
            undefined
          }
        />
        <MetricTile label="Response time" value="1.4s" icon="bolt" comingSoon />
      </div>

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

      <RecentLeadsTable leads={recentLeads} />

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
            <>
              {embedNeedsKeySetup ? (
                <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  <p className="font-semibold">
                    Your embed can&apos;t answer questions yet.
                  </p>
                  <p className="mt-1">
                    The widget uses a managed AI key (visitors don&apos;t bring
                    their own). Save one under{" "}
                    <Link
                      href={`/dashboard/bots/${selectedBot.id}/settings?tab=model`}
                      className="font-semibold text-amber-900 underline"
                    >
                      Settings → AI Model &amp; Key
                    </Link>{" "}
                    to activate it.
                  </p>
                </div>
              ) : null}
              <EmbedSnippet
                botId={selectedBot.id}
                username={username}
                themeColor={selectedBot.themeColor}
                origin={origin}
              />
            </>
          ) : (
            <p className="text-sm text-muted">No bot selected.</p>
          )}
          <a
            href={EMBED_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block rounded-lg py-2 text-center text-sm font-semibold text-brand transition-colors hover:bg-blue-50"
          >
            Full embed guide
          </a>
        </div>
      </div>
    </div>
  );
}
