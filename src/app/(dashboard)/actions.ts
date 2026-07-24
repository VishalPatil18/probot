"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { authOptions } from "@/lib/auth/auth";
import { bots, db } from "@/lib/db";
import { writeSelectedBotCookie } from "@/lib/server/selected-bot";

export async function selectBotAction(formData: FormData): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  const raw = formData.get("botId");
  if (typeof raw !== "string") return;

  const bot = await db.query.bots.findFirst({
    where: and(eq(bots.id, raw), eq(bots.userId, session.user.id)),
    columns: { id: true },
  });
  if (!bot) return;

  writeSelectedBotCookie(bot.id);
  revalidatePath("/");
}
