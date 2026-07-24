import { desc, eq } from "drizzle-orm";

import { type BotPreset, botPresets, db } from "@/lib/db";

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
