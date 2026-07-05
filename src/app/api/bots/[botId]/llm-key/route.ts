import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isProviderName, type ProviderName } from "@/lib/ai/providers";
import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { KekUnavailableError, encryptKey } from "@/lib/crypto/envelope";
import { db, encryptedLlmKeys } from "@/lib/db";

// POST /api/bots/[botId]/llm-key
//
// Managed-key storage endpoint.
//
// Stores the user-supplied LLM API key on pro-bot.dev encrypted with
// envelope encryption. This is the "managed-key" opt-in: lets the bot
// respond to recruiters even when the creator's browser is offline,
// at the cost of trusting pro-bot.dev's infra (not its DB - DB leak alone
// can't decrypt). The DELETE path below revokes.
//
// The key never appears in the response, never in a log line, never in
// an error message. If KEK is unavailable (operator hasn't set up the
// managed flow), we surface a 503 with a clear message rather than 500
// so the dashboard can guide the user.

const storeInput = z.object({
  apiKey: z.string().min(8).max(512),
});

export async function POST(
  request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;
  const { bot } = owner;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = storeInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed" }, { status: 400 });
  }

  // Read the bot owner's current provider so we can stamp it on the row.
  // Storing it denormalised lets the chat route confirm "is the stored key
  // for the provider this bot currently uses?" without an extra users-table
  // read.
  const ownerRow = await db.query.users.findFirst({
    where: (users, { eq: eqOp }) => eqOp(users.id, bot.userId),
    columns: { llmProvider: true },
  });
  if (!ownerRow || !isProviderName(ownerRow.llmProvider)) {
    return NextResponse.json({ error: "provider_unset" }, { status: 400 });
  }
  const provider: ProviderName = ownerRow.llmProvider;

  let payload: ReturnType<typeof encryptKey>;
  try {
    payload = encryptKey(parsed.data.apiKey);
  } catch (err) {
    if (err instanceof KekUnavailableError) {
      return NextResponse.json(
        {
          error: "managed_storage_unavailable",
          message:
            "This deployment hasn't enabled managed key storage. Use the self-hosted path or contact the operator.",
        },
        { status: 503 },
      );
    }
    throw err;
  }

  // UPSERT on bot_id - one managed key per bot. Re-submitting replaces.
  await db
    .insert(encryptedLlmKeys)
    .values({
      botId: bot.id,
      ciphertext: payload.ciphertext,
      iv: payload.iv,
      authTag: payload.authTag,
      wrappedDek: payload.wrappedDek,
      dekIv: payload.dekIv,
      dekAuthTag: payload.dekAuthTag,
      provider,
    })
    .onConflictDoUpdate({
      target: encryptedLlmKeys.botId,
      set: {
        ciphertext: payload.ciphertext,
        iv: payload.iv,
        authTag: payload.authTag,
        wrappedDek: payload.wrappedDek,
        dekIv: payload.dekIv,
        dekAuthTag: payload.dekAuthTag,
        provider,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ status: "stored", provider });
}

// DELETE /api/bots/[botId]/llm-key
//
// Revokes the managed key. After this call, recruiters can no longer chat
// with the bot unless the creator re-stores a key or the bot is hit with a
// header-supplied key (self-host / dashboard test chat path).
export async function DELETE(
  _request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;
  const { bot } = owner;

  await db.delete(encryptedLlmKeys).where(eq(encryptedLlmKeys.botId, bot.id));
  return NextResponse.json({ status: "revoked" });
}
