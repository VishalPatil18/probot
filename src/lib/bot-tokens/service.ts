import { and, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { generateRawToken, hashToken } from "@/lib/auth/tokens";
import { type Bot, botTokens, bots, db } from "@/lib/db";

const TOKEN_PREFIX = "pbt_";
const BEARER_RE = /^Bearer\s+(pbt_[0-9a-f]{64})$/i;

export interface MintedToken {
  id: string;
  rawToken: string;
}

export async function mintBotToken(
  botId: string,
  name: string,
): Promise<MintedToken> {
  const rawToken = `${TOKEN_PREFIX}${generateRawToken()}`;
  const tokenHash = hashToken(rawToken);
  const [row] = await db
    .insert(botTokens)
    .values({ botId, name, tokenHash })
    .returning({ id: botTokens.id });
  if (!row) throw new Error("bot_token_mint_failed");
  return { id: row.id, rawToken };
}

export interface BotTokenView {
  id: string;
  name: string;
  lastSeenAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}

export async function listBotTokens(botId: string): Promise<BotTokenView[]> {
  return db.query.botTokens.findMany({
    where: eq(botTokens.botId, botId),
    columns: {
      id: true,
      name: true,
      lastSeenAt: true,
      createdAt: true,
      revokedAt: true,
    },
    orderBy: [desc(botTokens.createdAt)],
  });
}

export async function revokeBotToken(
  botId: string,
  tokenId: string,
): Promise<boolean> {
  const result = await db
    .update(botTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(botTokens.id, tokenId),
        eq(botTokens.botId, botId),
        isNull(botTokens.revokedAt),
      ),
    )
    .returning({ id: botTokens.id });
  return result.length > 0;
}

export type BotAuthResult =
  | { ok: true; bot: Bot; tokenId: string }
  | { ok: false; status: number; error: string };

export async function authenticateBotToken(
  headers: Headers,
): Promise<BotAuthResult> {
  const match = BEARER_RE.exec((headers.get("authorization") ?? "").trim());
  if (!match || !match[1]) {
    return { ok: false, status: 401, error: "missing_bot_token" };
  }

  const tokenHash = hashToken(match[1]);
  const tokenRow = await db.query.botTokens.findFirst({
    where: eq(botTokens.tokenHash, tokenHash),
  });
  if (!tokenRow || tokenRow.revokedAt) {
    return { ok: false, status: 401, error: "invalid_bot_token" };
  }

  const bot = await db.query.bots.findFirst({ where: eq(bots.id, tokenRow.botId) });
  if (!bot) {
    return { ok: false, status: 401, error: "invalid_bot_token" };
  }

  try {
    await db
      .update(botTokens)
      .set({ lastSeenAt: new Date() })
      .where(eq(botTokens.id, tokenRow.id));
  } catch {
  }

  return { ok: true, bot, tokenId: tokenRow.id };
}

export type RequireBotTokenResult =
  | { ok: true; bot: Bot; tokenId: string }
  | { ok: false; response: NextResponse };

export async function requireBotToken(
  headers: Headers,
): Promise<RequireBotTokenResult> {
  const auth = await authenticateBotToken(headers);
  if (auth.ok) return { ok: true, bot: auth.bot, tokenId: auth.tokenId };
  return {
    ok: false,
    response: NextResponse.json(
      { error: auth.error },
      { status: auth.status },
    ),
  };
}
