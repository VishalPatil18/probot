import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { Pagination } from "@/components/dashboard/Pagination";
import { authOptions } from "@/lib/auth/auth";
import { bots, db } from "@/lib/db";
import { listLeads } from "@/lib/leads/queries";
import { DEFAULT_LIMIT } from "@/lib/pagination";

type Props = {
  params: { botId: string };
  searchParams: { page?: string };
};

function fmtFull(d: Date): string {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const SAFE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function safeMailtoHref(email: string): string | null {
  return SAFE_EMAIL.test(email) ? `mailto:${email}` : null;
}

export default async function LeadsListPage({ params, searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) notFound();

  const bot = await db.query.bots.findFirst({
    where: and(eq(bots.id, params.botId), eq(bots.userId, session.user.id)),
    columns: { id: true, name: true },
  });
  if (!bot) notFound();

  const pageNum = Math.max(1, Number(searchParams.page) || 1);
  const limit = DEFAULT_LIMIT;
  const { items, total } = await listLeads({
    botId: bot.id,
    limit,
    offset: (pageNum - 1) * limit,
  });

  const basePath = `/dashboard/bots/${bot.id}/leads`;

  return (
    <div className="max-w-4xl px-6 py-8 lg:px-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Leads</h1>
          <p className="mt-1 text-sm text-muted">
            Recruiter emails captured during chats with {bot.name}.
          </p>
        </div>
        {total > 0 ? (
          <a
            href={`/api/bots/${bot.id}/leads/export`}
            download
            className="flex-shrink-0 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90"
          >
            Export CSV
          </a>
        ) : null}
      </header>

      {items.length === 0 ? (
        <EmptyState
          title="No leads captured yet."
          body={`When recruiters share their email during a chat, ${bot.name} captures it here.`}
        />
      ) : (
        <ul className="space-y-3">
          {items.map((l) => (
            <li
              key={l.id}
              className="rounded-2xl border border-border-base bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {l.name ? (
                    <p className="text-sm font-semibold text-text-base">
                      {l.name}
                    </p>
                  ) : null}
                  {(() => {
                    const href = safeMailtoHref(l.email);
                    return href ? (
                      <a
                        href={href}
                        className={`text-sm hover:underline ${l.name ? "text-brand" : "font-semibold text-brand"}`}
                      >
                        {l.email}
                      </a>
                    ) : (
                      <span className="text-sm font-semibold text-text-base">
                        {l.email}
                      </span>
                    );
                  })()}
                  {l.company || l.linkedinUrl ? (
                    <p className="mt-1 text-xs text-muted">
                      {l.company}
                      {l.company && l.linkedinUrl ? " · " : ""}
                      {l.linkedinUrl ? (
                        <a
                          href={l.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand hover:underline"
                        >
                          LinkedIn
                        </a>
                      ) : null}
                    </p>
                  ) : null}
                  {l.contextSummary ? (
                    <p className="mt-2 text-sm text-muted">
                      {l.contextSummary}
                    </p>
                  ) : null}
                  {l.conversationId ? (
                    <Link
                      href={`/dashboard/bots/${bot.id}/conversations/${l.conversationId}`}
                      className="mt-2 inline-block text-xs font-semibold text-muted hover:text-text-base"
                    >
                      View conversation
                    </Link>
                  ) : null}
                </div>
                <p className="flex-shrink-0 text-xs text-muted">
                  {fmtFull(l.capturedAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        basePath={basePath}
        page={pageNum}
        limit={limit}
        total={total}
      />
    </div>
  );
}
