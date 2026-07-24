import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { Pagination } from "@/components/dashboard/Pagination";
import { SearchBar } from "@/components/dashboard/SearchBar";
import { authOptions } from "@/lib/auth/auth";
import { listConversations } from "@/lib/conversations/queries";
import { bots, db } from "@/lib/db";
import { DEFAULT_LIMIT } from "@/lib/pagination";

type Props = {
  params: { botId: string };
  searchParams: { page?: string; q?: string };
};

function relTime(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return d.toLocaleDateString();
}

export default async function ConversationsListPage({
  params,
  searchParams,
}: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) notFound();

  const bot = await db.query.bots.findFirst({
    where: and(eq(bots.id, params.botId), eq(bots.userId, session.user.id)),
    columns: { id: true, name: true },
  });
  if (!bot) notFound();

  const pageNum = Math.max(1, Number(searchParams.page) || 1);
  const limit = DEFAULT_LIMIT;
  const q = searchParams.q?.trim() ?? "";

  const { items, total } = await listConversations({
    botId: bot.id,
    q: q || undefined,
    limit,
    offset: (pageNum - 1) * limit,
  });

  const basePath = `/dashboard/bots/${bot.id}/conversations`;

  return (
    <div className="max-w-4xl px-6 py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Conversations</h1>
        <p className="mt-1 text-sm text-muted">
          Every chat that {bot.name} has had, newest first.
        </p>
      </header>

      <div className="mb-4">
        <SearchBar
          basePath={basePath}
          placeholder="Search by email or message content…"
        />
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={
            q.length > 0
              ? `No conversations match "${q}"`
              : `No one has chatted with ${bot.name} yet.`
          }
          body={
            q.length > 0
              ? "Try a different search term, or clear the search to see everything."
              : "Share your public URL to get your first conversation."
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((c) => (
            <li key={c.id}>
              <Link
                href={`/dashboard/bots/${bot.id}/conversations/${c.id}`}
                className="block rounded-2xl border border-border-base bg-white p-5 shadow-sm transition hover:border-brand/40 hover:shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-base">
                      {c.recruiterEmail ?? "Anonymous"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">
                      {c.firstUserMessage ?? "(no preview available)"}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right text-xs text-muted">
                    <p>{relTime(c.startedAt)}</p>
                    <p className="mt-1 tabular-nums">{c.messageCount} msgs</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        basePath={basePath}
        page={pageNum}
        limit={limit}
        total={total}
        extraParams={{ q }}
      />
    </div>
  );
}
