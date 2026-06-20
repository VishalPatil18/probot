import Link from "next/link";

import type { UserConversationRow } from "@/lib/conversations/queries";

type Props = {
  conversations: UserConversationRow[];
  totalCount: number;
};

function relTimeShort(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
}

function truncate(s: string | null, max: number): string {
  if (!s) return "";
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export function RecentConversationsList({
  conversations,
  totalCount,
}: Props) {
  if (conversations.length === 0) {
    return (
      <div className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
        <h3 className="mb-4 font-bold">Recent conversations</h3>
        <p className="rounded-xl border-2 border-dashed border-border-base p-6 text-center text-sm text-muted">
          No conversations yet — share your bot URL to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
      <h3 className="mb-4 font-bold">Recent conversations</h3>
      <div className="space-y-1">
        {conversations.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/bots/${c.botId}/conversations/${c.id}`}
            className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-neutral-50"
          >
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-neutral-100 text-muted">
              <svg
                aria-hidden
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="7" r="4" />
                <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {c.recruiterEmail ?? "Anonymous visitor"}
              </p>
              <p className="truncate text-xs text-muted">
                {truncate(c.firstUserMessage, 80) || "(no preview)"}
              </p>
            </div>
            <span className="shrink-0 text-[10px] text-muted">
              {relTimeShort(c.startedAt)}
            </span>
          </Link>
        ))}
      </div>
      {totalCount > conversations.length && conversations[0] ? (
        <Link
          href={`/dashboard/bots/${conversations[0].botId}/conversations`}
          className="mt-4 block rounded-lg py-2 text-center text-sm font-semibold text-brand transition-colors hover:bg-blue-50"
        >
          View all {totalCount} conversations
        </Link>
      ) : null}
    </div>
  );
}
