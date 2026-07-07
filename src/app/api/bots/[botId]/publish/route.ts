import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { bots, db, encryptedLlmKeys, users } from "@/lib/db";

// POST /api/bots/[botId]/publish
//
// Flips a draft bot to live. Clears the preview_token so
// the now-public bot can't also be reached via the (no-longer-relevant)
// preview URL. The reverse direction (publish → unpublish) is the existing
// PATCH endpoint's `isActive: false` path; we deliberately do NOT remint a
// preview token on unpublish - the dashboard already gates access via the
// session cookie, so previewing your own paused bot is allowed at the
// public URL with no token shenanigans needed (the chat route's preview
// path is for tokens; the dashboard test chat path uses the creator session
// directly when added later).
export async function POST(
  _request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;
  const { bot } = owner;

  if (bot.isActive) {
    // Already published - idempotent success rather than 409 so a double-tap
    // on the Publish button doesn't surface a confusing error.
    return NextResponse.json({ bot: { id: bot.id, isActive: true } });
  }

  // Managed-mode bots need a stored envelope-encrypted key before going live
  // — the embed widget POSTs /api/chat with no key header and would 400 on
  // every visitor question. Ollama is exempt (adapter uses a placeholder).
  // Self-hosted bots are always active from creation and never route through
  // this endpoint (their chat runs entirely in the consumer's webapp).
  if (bot.deploymentMode !== "self_hosted") {
    const ownerRow = await db.query.users.findFirst({
      where: eq(users.id, bot.userId),
      columns: { llmProvider: true },
    });
    if (ownerRow?.llmProvider !== "ollama") {
      const storedKey = await db.query.encryptedLlmKeys.findFirst({
        where: eq(encryptedLlmKeys.botId, bot.id),
        columns: { botId: true },
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
