import { NextResponse } from "next/server";
import { z } from "zod";

import { listBotTokens, mintBotToken } from "@/lib/bot-tokens/service";
import { requireBotOwner } from "@/lib/bots/require-bot-owner";

// /api/bots/[botId]/tokens  (owner-gated, same-origin dashboard)
//
// GET  - list this bot's tokens (id, name, lastSeenAt, createdAt, revokedAt).
//        Never returns the hash or the raw secret.
// POST - mint a new token. The raw `pbt_…` secret is returned EXACTLY ONCE in
//        this response (GitHub "personal access token" pattern); after this it
//        is unrecoverable - only its hash is stored.

const mintSchema = z.object({ name: z.string().trim().min(1).max(80) });

export async function GET(
  _request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;
  const tokens = await listBotTokens(owner.bot.id);
  return NextResponse.json({ tokens });
}

export async function POST(
  request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = mintSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const minted = await mintBotToken(owner.bot.id, parsed.data.name);
  return NextResponse.json(
    { id: minted.id, name: parsed.data.name, token: minted.rawToken },
    { status: 201 },
  );
}
