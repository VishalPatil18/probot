import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { type Bot, bots, db } from "@/lib/db";

export type RequireBotOwnerResult =
  | { ok: true; bot: Bot; userId: string }
  | { ok: false; response: NextResponse };

export async function requireBotOwner(
  botId: string,
): Promise<RequireBotOwnerResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const userId = session.user.id;

  const bot = await db.query.bots.findFirst({
    where: eq(bots.id, botId),
  });
  if (!bot) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Bot not found" }, { status: 404 }),
    };
  }
  if (bot.userId !== userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, bot, userId };
}
