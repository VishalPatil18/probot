import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { botAvatars, bots, db } from "@/lib/db";
import { parseImageUpload, toPublicImageUrl } from "@/lib/uploads/image-upload";

// POST /api/bots/[botId]/avatar - owner-gated upload of a bot's profile picture.
// Bytes go into `bot_avatars` (one row per bot, upserted) and `bots.image` is
// pointed at the public serve route GET /api/bot-avatar/<botId>. Same shape as
// the user-avatar route; shares validation/sniffing via image-upload helper.

export async function POST(
  request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const parsed = await parseImageUpload(form);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const { buffer, contentType } = parsed;
  const botId = owner.bot.id;

  // Root-relative on purpose: decouples the stored value from the writer's
  // deployment origin so a bot uploaded on `next dev` still renders in
  // production. `?v=` busts any cached copy of the stable avatar URL after a
  // re-upload.
  const storedImage = `/api/bot-avatar/${botId}?v=${Date.now()}`;

  await db.transaction(async (tx) => {
    await tx
      .insert(botAvatars)
      .values({ botId, data: buffer, contentType })
      .onConflictDoUpdate({
        target: botAvatars.botId,
        set: { data: buffer, contentType, updatedAt: new Date() },
      });
    await tx.update(bots).set({ image: storedImage }).where(eq(bots.id, botId));
  });

  // Return the display-ready (absolutized) URL so the client updates its UI
  // without a re-fetch through the config API.
  return NextResponse.json({ image: toPublicImageUrl(storedImage) });
}
