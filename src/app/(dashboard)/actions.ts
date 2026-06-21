"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { authOptions } from "@/lib/auth/auth";
import { bots, db } from "@/lib/db";
import { writeSelectedBotCookie } from "@/lib/server/selected-bot";

// Server action target for the bot switcher dropdown. Validates the
// session AND the bot's ownership before writing the cookie - a forged
// form payload pointing at another user's bot is rejected silently and
// the cookie is not updated.
//
// Returns `void` (matches the form-action signature). On success we
// `revalidatePath('/')` so every cached dashboard page re-renders with
// the new selected bot context.
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
