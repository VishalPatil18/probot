import { and, desc, eq, gt } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { db, decryptAuditLog, encryptedLlmKeys } from "@/lib/db";

const RETENTION_DAYS = 30;
const MAX_ROWS = 200; // cap response payload regardless of retention window

// GET /api/bots/[botId]/llm-key/audit
//
// Stage 7 Phase 3 - decrypt audit log for the dashboard.
//
// Returns:
//   {
//     stored: true | false,        // is a managed key currently stored?
//     provider: string | null,     // provider stamped on the stored row
//     lastDecryptedAt: string | null,  // ISO of most recent decrypt event
//     entries: [{ decryptedAt, ipHashSuffix }]  // last 30d, capped at 200
//   }
//
// `ipHashSuffix` is the last 8 hex chars of the SHA-256(salt + IP). Enough
// for a creator to spot "different IPs decrypted my key" without exposing
// PII back to the creator's own dashboard - the salted hash is already
// ungroupable across deploys; truncating to 8 hex (32 bits) gives a
// readable per-row tag that's still effectively unique within the bot's
// own audit log.
export async function GET(
  _request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;
  const { bot } = owner;

  const stored = await db.query.encryptedLlmKeys.findFirst({
    where: eq(encryptedLlmKeys.botId, bot.id),
    columns: { provider: true },
  });

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      decryptedAt: decryptAuditLog.decryptedAt,
      requesterIpHash: decryptAuditLog.requesterIpHash,
    })
    .from(decryptAuditLog)
    .where(
      and(
        eq(decryptAuditLog.botId, bot.id),
        gt(decryptAuditLog.decryptedAt, cutoff),
      ),
    )
    .orderBy(desc(decryptAuditLog.decryptedAt))
    .limit(MAX_ROWS);

  return NextResponse.json({
    stored: stored !== undefined,
    provider: stored?.provider ?? null,
    lastDecryptedAt: rows[0]?.decryptedAt?.toISOString() ?? null,
    entries: rows.map((r) => ({
      decryptedAt: r.decryptedAt.toISOString(),
      ipHashSuffix: r.requesterIpHash
        ? r.requesterIpHash.slice(-8)
        : null,
    })),
  });
}
