import { NextResponse } from "next/server";

import { revokeBotToken } from "@/lib/bot-tokens/service";
import { requireBotOwner } from "@/lib/bots/require-bot-owner";

export async function DELETE(
  _request: Request,
  { params }: { params: { botId: string; tokenId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;
  if (owner.bot.deploymentMode !== "self_hosted") {
    return NextResponse.json({ error: "not_self_hosted" }, { status: 400 });
  }

  const revoked = await revokeBotToken(owner.bot.id, params.tokenId);
  if (!revoked) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
