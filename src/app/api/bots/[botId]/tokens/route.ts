import { NextResponse } from "next/server";
import { z } from "zod";

import { listBotTokens, mintBotToken } from "@/lib/bot-tokens/service";
import { requireBotOwner } from "@/lib/bots/require-bot-owner";

const mintInput = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function GET(
  _request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;
  if (owner.bot.deploymentMode !== "self_hosted") {
    return NextResponse.json({ error: "not_self_hosted" }, { status: 400 });
  }

  const tokens = await listBotTokens(owner.bot.id);
  return NextResponse.json({ tokens });
}

export async function POST(
  request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;
  if (owner.bot.deploymentMode !== "self_hosted") {
    return NextResponse.json({ error: "not_self_hosted" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = mintInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed" }, { status: 400 });
  }

  const token = await mintBotToken(owner.bot.id, parsed.data.name);
  return NextResponse.json({ token }, { status: 201 });
}
