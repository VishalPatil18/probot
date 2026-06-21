import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import { authOptions } from "@/lib/auth/auth";
import { bots, db } from "@/lib/db";

// The bot detail page is no longer a useful surface. The
// dashboard home shows aggregated stats + share-your-bot; the
// settings page hosts Bot configuration / Knowledge base /
// theme color. There's nothing left for the standalone detail page to
// own. Redirect to the settings page's Bot configuration tab so any
// existing bookmarks still land somewhere useful.
//
// Ownership is enforced first - non-owners get 404 (not 403) to avoid
// leaking the existence of arbitrary bot IDs.
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
