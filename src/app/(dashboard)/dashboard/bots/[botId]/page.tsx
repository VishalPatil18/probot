import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmbedSnippet } from "@/components/dashboard/EmbedSnippet";
import { StatCard } from "@/components/dashboard/StatCard";
import { ThemeColorPicker } from "@/components/dashboard/ThemeColorPicker";
import { getAnalyticsForBot } from "@/lib/analytics/queries";
import { authOptions } from "@/lib/auth/auth";
import { bots, db } from "@/lib/db";
import { getOrigin } from "@/lib/server/origin";

// Stage 5: bot detail page. Shows the bot's identity + Share / Embed /
// Theme surfaces. Auth + placeholder-username gates are enforced by the
// parent (dashboard) layout — by the time this renders we have a real,
// shareable username on the session.
//
// Ownership is verified via the (botId, userId) WHERE clause: a request
// for someone else's botId returns 404, not 403, so we don't leak the
// existence of arbitrary bot IDs.
export default async function BotDetailPage({
  params,
}: {
  params: { botId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.username) {
    notFound();
  }

  const bot = await db.query.bots.findFirst({
    where: and(eq(bots.id, params.botId), eq(bots.userId, session.user.id)),
    columns: {
      id: true,
      name: true,
      headline: true,
      isActive: true,
      themeColor: true,
    },
  });
  if (!bot) notFound();

  const origin = getOrigin();
  const username = session.user.username;
  const analytics = await getAnalyticsForBot(bot.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex text-xs font-semibold text-muted hover:text-text-base"
      >
        ← All bots
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl font-semibold">{bot.name}</h1>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              bot.isActive
                ? "bg-emerald-100 text-emerald-700"
                : "bg-neutral-200 text-neutral-700"
            }`}
          >
            {bot.isActive ? "Live" : "Inactive"}
          </span>
        </div>
        {bot.headline ? (
          <p className="mt-1 text-sm text-muted">{bot.headline}</p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <Link
            href={`/dashboard/bots/new`}
            className="rounded-xl border border-border-base bg-white px-3 py-2 text-xs font-semibold hover:bg-neutral-50"
          >
            Edit content
          </Link>
          <Link
            href={`${origin}/u/${username}/chat`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-border-base bg-white px-3 py-2 text-xs font-semibold hover:bg-neutral-50"
          >
            Open chat ↗
          </Link>
        </div>
      </header>

      <section className="mb-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Conversations"
            value={analytics.totalConversations}
            hint={`${analytics.conversationsThisMonth} in last 30 days`}
          />
          <StatCard
            label="Messages"
            value={analytics.totalMessages}
          />
          <StatCard
            label="Leads"
            value={analytics.totalLeads}
            hint={`${analytics.leadsThisMonth} in last 30 days`}
          />
          <StatCard label="Status" value={bot.isActive ? "Live" : "Off"} />
        </div>
        <nav className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link
            href={`/dashboard/bots/${bot.id}/conversations`}
            className="rounded-xl border border-border-base bg-white px-3 py-2 font-semibold hover:bg-neutral-50"
          >
            Conversations →
          </Link>
          <Link
            href={`/dashboard/bots/${bot.id}/leads`}
            className="rounded-xl border border-border-base bg-white px-3 py-2 font-semibold hover:bg-neutral-50"
          >
            Leads →
          </Link>
        </nav>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 font-display text-xl font-semibold">
          Share and embed
        </h2>
        <EmbedSnippet
          botId={bot.id}
          username={username}
          themeColor={bot.themeColor}
          origin={origin}
        />
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl font-semibold">Appearance</h2>
        <ThemeColorPicker
          botId={bot.id}
          initialColor={bot.themeColor}
        />
      </section>
    </div>
  );
}
