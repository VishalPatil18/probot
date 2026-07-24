import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isProviderName, type ProviderName } from "@/lib/ai/providers";
import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { KekUnavailableError, encryptKey } from "@/lib/crypto/envelope";
import { db, encryptedLlmKeys } from "@/lib/db";

const storeInput = z.object({
  apiKey: z.string().min(8).max(512),
  azureEndpoint: z
    .string()
    .max(512)
    .url()
    .startsWith("https://")
    .optional(),
  azureApiVersion: z.string().min(1).max(64).optional(),
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

  const ownerRow = await db.query.users.findFirst({
    where: (users, { eq: eqOp }) => eqOp(users.id, bot.userId),
    columns: { llmProvider: true },
  });
  if (!ownerRow || !isProviderName(ownerRow.llmProvider)) {
    return NextResponse.json({ error: "provider_unset" }, { status: 400 });
  }
  const provider: ProviderName = ownerRow.llmProvider;

  if (provider === "azure" && !parsed.data.azureEndpoint) {
    return NextResponse.json(
      {
        error: "azure_endpoint_required",
        message:
          "Azure OpenAI needs its endpoint URL stored with the key. Add the endpoint and save again.",
      },
      { status: 400 },
    );
  }
  const azureEndpoint =
    provider === "azure" ? (parsed.data.azureEndpoint ?? null) : null;
  const azureApiVersion =
    provider === "azure" ? (parsed.data.azureApiVersion ?? null) : null;

  let payload: ReturnType<typeof encryptKey>;
  try {
    payload = encryptKey(parsed.data.apiKey);
  } catch (err) {
    if (err instanceof KekUnavailableError) {
      return NextResponse.json(
        {
          error: "managed_storage_unavailable",
          message:
            "This deployment hasn't enabled managed key storage. Register a self-hosted bot and use the probot-self-hosted npm package, or contact the operator.",
        },
        { status: 503 },
      );
    }
    throw err;
  }

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
      azureEndpoint,
      azureApiVersion,
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
        azureEndpoint,
        azureApiVersion,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ status: "stored", provider });
}

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
