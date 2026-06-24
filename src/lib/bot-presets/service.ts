import { desc, eq } from "drizzle-orm";

import { type BotPreset, botPresets, db } from "@/lib/db";

// Saved bot-configuration presets, scoped to a user. A preset is an opaque JSON
// snapshot of a bot's settings the owner can reuse when creating a future bot.
// Belongs to the user (not a bot) so it survives the bot it was captured from.

export async function saveBotPreset(
  userId: string,
  name: string,
  settings: Record<string, unknown>,
): Promise<{ id: string }> {
  const [row] = await db
    .insert(botPresets)
    .values({ userId, name, settings })
    .returning({ id: botPresets.id });
  if (!row) throw new Error("bot_preset_save_failed");
  return { id: row.id };
}

export interface BotPresetView {
  id: string;
  name: string;
  settings: Record<string, unknown>;
  createdAt: Date;
}

export async function listBotPresets(
  userId: string,
): Promise<BotPresetView[]> {
  const rows: BotPreset[] = await db.query.botPresets.findMany({
    where: eq(botPresets.userId, userId),
    orderBy: [desc(botPresets.createdAt)],
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    settings: r.settings,
    createdAt: r.createdAt,
  }));
}
