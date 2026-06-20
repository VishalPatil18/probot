import { desc, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import Link from "next/link";

import { CopyUrlButton } from "@/components/dashboard/CopyUrlButton";
import { StatCard } from "@/components/dashboard/StatCard";
import { getAnalyticsForUser } from "@/lib/analytics/queries";
import { authOptions } from "@/lib/auth/auth";
import { bots, db } from "@/lib/db";
import { getOrigin } from "@/lib/server/origin";

// Stage 4 plan.md §4: dashboard home is the user's return-visit surface.
// Lists their bots with the shareable URL + copy button + "Edit" link.
// First-time visitors (no bots yet) see a CTA to /dashboard/bots/new.
//
// Auth is enforced by the parent layout (src/app/(dashboard)/layout.tsx).
// Placeholder-username detection lives there too, so by the time this
// component renders the session always has a real, shareable username.
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  // The parent layout redirects to /login when session is absent, so this
  // is here for type narrowing and as a defense-in-depth check.
  if (!session?.user?.id || !session.user.username) {
    return null;
  }

  const username = session.user.username;
  const [ownedBots, analytics] = await Promise.all([
    db
      .select({
        id: bots.id,
        name: bots.name,
        headline: bots.headline,
        isActive: bots.isActive,
        updatedAt: bots.updatedAt,
      })
      .from(bots)
      .where(eq(bots.userId, session.user.id))
      .orderBy(desc(bots.updatedAt)),
    getAnalyticsForUser(session.user.id),
  ]);

  const origin = getOrigin();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Your bots</h1>
          <p className="mt-1 text-sm text-muted">
            Each bot has a public URL anyone can chat with.
          </p>
        </div>
        <Link
          href="/dashboard/bots/new"
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90"
        >
          + New bot
        </Link>
      </header>

      {analytics.totalBots > 0 ? (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Bots" value={analytics.totalBots} />
          <StatCard
            label="Conversations"
            value={analytics.totalConversations}
          />
          <StatCard label="Messages" value={analytics.totalMessages} />
          <StatCard label="Leads" value={analytics.totalLeads} />
          <StatCard
            label="Leads this month"
            value={analytics.leadsThisMonth}
            hint="Last 30 days"
          />
        </div>
      ) : null}

      {ownedBots.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border-base bg-white p-10 text-center">
          <p className="text-sm font-semibold">No bots yet.</p>
          <p className="mt-1 text-xs text-muted">
            Build one in under a minute.
          </p>
          <Link
            href="/dashboard/bots/new"
            className="mt-4 inline-block rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90"
          >
            Create your first bot
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {ownedBots.map((bot) => {
            const url = `${origin}/u/${username}/chat`;
            return (
              <li
                key={bot.id}
                className="rounded-2xl border border-border-base bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-semibold">
                      {bot.name}
                    </p>
                    {bot.headline ? (
                      <p className="mt-0.5 truncate text-sm text-muted">
                        {bot.headline}
                      </p>
                    ) : null}
                    <p className="mt-2 truncate font-mono text-xs text-muted">
                      {url}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <CopyUrlButton url={url} />
                    <Link
                      href={`/dashboard/bots/${bot.id}`}
                      className="rounded-xl border border-border-base bg-white px-3 py-2 text-xs font-semibold hover:bg-neutral-50"
                    >
                      Manage
                    </Link>
                    <Link
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-border-base bg-white px-3 py-2 text-xs font-semibold hover:bg-neutral-50"
                    >
                      Open ↗
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
