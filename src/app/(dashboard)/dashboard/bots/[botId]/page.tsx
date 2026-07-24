import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import { authOptions } from "@/lib/auth/auth";
import { bots, db } from "@/lib/db";

export default async function BotDetailRedirect({
  params,
}: {
  params: { botId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) notFound();

  const bot = await db.query.bots.findFirst({
    where: and(eq(bots.id, params.botId), eq(bots.userId, session.user.id)),
    columns: { id: true },
  });
  if (!bot) notFound();

  redirect(`/dashboard/bots/${bot.id}/settings?tab=bot`);
}
