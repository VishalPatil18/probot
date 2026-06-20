import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import { TranscriptMessage } from "@/components/dashboard/TranscriptMessage";
import { authOptions } from "@/lib/auth/auth";
import { getConversationWithMessages } from "@/lib/conversations/queries";
import { bots, db } from "@/lib/db";

type Props = {
  params: { botId: string; convId: string };
};

function fmtFull(d: Date): string {
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Defense-in-depth: emails are Zod-validated at lead-capture time, but a
// future schema drift or direct-DB write must not let a malformed value
// flow into a mailto: href that a screen reader announces or a click
// follows. The regex matches the same plain shape Zod uses.
const SAFE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function safeMailtoHref(email: string | null | undefined): string | null {
  if (!email || !SAFE_EMAIL.test(email)) return null;
  return `mailto:${email}`;
}

export default async function ConversationDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) notFound();

  const bot = await db.query.bots.findFirst({
    where: and(eq(bots.id, params.botId), eq(bots.userId, session.user.id)),
    columns: { id: true, name: true },
  });
  if (!bot) notFound();

  const convo = await getConversationWithMessages({
    botId: bot.id,
    conversationId: params.convId,
  });
  if (!convo) notFound();

  return (
    <div className="max-w-3xl px-6 py-8 lg:px-8">
      <header className="mb-6 rounded-2xl border border-border-base bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold">
              {convo.recruiterEmail ?? "Anonymous conversation"}
            </h1>
            <p className="mt-1 text-xs text-muted">
              Started {fmtFull(convo.startedAt)} · {convo.messageCount} messages
            </p>
          </div>
          {safeMailtoHref(convo.recruiterEmail) ? (
            <a
              href={safeMailtoHref(convo.recruiterEmail) ?? undefined}
              className="rounded-xl border border-border-base bg-white px-3 py-1.5 text-xs font-semibold text-text-base hover:bg-gray-50"
            >
              Email back
            </a>
          ) : null}
        </div>
      </header>

      {convo.messages.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-border-base bg-white p-8 text-center text-sm text-muted">
          This conversation has no messages.
        </p>
      ) : (
        <div className="space-y-4">
          {convo.messages.map((m) => (
            <TranscriptMessage
              key={m.id}
              role={m.role}
              content={m.content}
              createdAt={m.createdAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
