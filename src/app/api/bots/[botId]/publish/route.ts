import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { bots, db, encryptedLlmKeys, users } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;
  const { bot } = owner;

  if (bot.isActive) {
    return NextResponse.json({ bot: { id: bot.id, isActive: true } });
  }

  if (bot.deploymentMode !== "self_hosted") {
    const ownerRow = await db.query.users.findFirst({
      where: eq(users.id, bot.userId),
      columns: { llmProvider: true },
    });
    const storedKey = await db.query.encryptedLlmKeys.findFirst({
      where: eq(encryptedLlmKeys.botId, bot.id),
      columns: { botId: true, azureEndpoint: true },
    });
    if (!storedKey) {
      return NextResponse.json(
        {
          error: "needs_managed_key",
          message:
            "Store an encrypted API key in Settings → AI Model & Key before publishing.",
        },
        { status: 400 },
      );
    }
    if (ownerRow?.llmProvider === "azure" && !storedKey.azureEndpoint) {
      return NextResponse.json(
        {
          error: "needs_managed_key",
          message:
            "Re-save your Azure key with its endpoint in Settings → AI Model & Key before publishing.",
        },
        { status: 400 },
      );
    }
  }

  const [updated] = await db
    .update(bots)
    .set({ isActive: true, previewToken: null })
    .where(eq(bots.id, bot.id))
    .returning({
      id: bots.id,
      isActive: bots.isActive,
    });

  return NextResponse.json({ bot: updated });
}
