import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import { ChatWindow } from "@/components/chat/ChatWindow";
import { authOptions } from "@/lib/auth/auth";
import { bots, db, users } from "@/lib/db";

type PageProps = {
  params: { username: string };
};

export async function generateMetadata({ params }: PageProps) {
  return {
    title: `Chat with ${params.username}'s AI · ProBot`,
  };
}

export default async function PublicChatPage({ params }: PageProps) {
  // Stage 1: auth-gated (plan.md §1.1). Stage 4 removes this gate to make
  // /u/[username]/chat truly public.
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/login?next=/u/${params.username}/chat`);
  }

  const owner = await db.query.users.findFirst({
    where: eq(users.username, params.username),
    columns: { id: true, username: true },
  });
  if (!owner) notFound();

  const bot = await db.query.bots.findFirst({
    where: and(eq(bots.userId, owner.id), eq(bots.isActive, true)),
  });
  if (!bot) notFound();

  return (
    <ChatWindow
      botId={bot.id}
      botName={bot.name}
      botHeadline={bot.headline}
      suggestedQuestions={bot.suggestedQuestions ?? []}
      loadingMessages={bot.loadingMessages}
    />
  );
}
