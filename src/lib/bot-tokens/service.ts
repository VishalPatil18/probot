import { and, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { generateRawToken, hashToken } from "@/lib/auth/tokens";
import { type Bot, botTokens, bots, db } from "@/lib/db";

// Stage 9 bot-token service. A self-hosted `probot-bot` runtime authenticates
// to /api/v1/bot/* with one of these tokens. The raw token is shown to the
// owner exactly once at mint time; only its SHA-256 hash is stored (same model
// as the password-reset / email-verification tokens), so a DB dump can't be
// replayed. Revocation is a soft-delete (`revoked_at`) so the audit row
// survives while the auth path rejects instantly.

const TOKEN_PREFIX = "pbt_";
const BEARER_RE = /^Bearer\s+(pbt_[0-9a-f]{64})$/i;

export interface MintedToken {
  id: string;
  // The full `pbt_<hex>` secret - returned ONCE, never retrievable again.
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

// Owner-facing view of a token row. Never includes the hash.
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

// Revoke scoped to the owning bot (defence in depth - the route already
// verified ownership). Returns false if no matching, still-active token.
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

// Resolve a request's `Authorization: Bearer pbt_…` header to its bot. The
// header format is validated before any DB hit; a valid-but-revoked or unknown
// token returns the same opaque `invalid_bot_token` so callers can't probe
// which tokens exist.
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

  // Best-effort liveness bump - never block the request if it fails.
  try {
    await db
      .update(botTokens)
      .set({ lastSeenAt: new Date() })
      .where(eq(botTokens.id, tokenRow.id));
  } catch {
    // ignore
  }

  return { ok: true, bot, tokenId: tokenRow.id };
}

export type RequireBotTokenResult =
  | { ok: true; bot: Bot; tokenId: string }
  | { ok: false; response: NextResponse };

// Route guard mirroring `requireBotOwner`: returns the authenticated bot or a
// ready-to-return 401 NextResponse, so /api/v1/bot/* handlers stay terse.
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
