import { NextResponse } from "next/server";

import { revokeBotToken } from "@/lib/bot-tokens/service";
import { requireBotOwner } from "@/lib/bots/require-bot-owner";

// DELETE /api/bots/[botId]/tokens/[tokenId]  (owner-gated)
//
// Soft-revokes the token (sets `revoked_at`). The next authenticated call from
// a runtime using it is rejected immediately. Revoke is scoped to the owning
// bot, so a token id from another bot can't be revoked through this route.
export async function DELETE(
  _request: Request,
  { params }: { params: { botId: string; tokenId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;

  const revoked = await revokeBotToken(owner.bot.id, params.tokenId);
  if (!revoked) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ revoked: true });
}
