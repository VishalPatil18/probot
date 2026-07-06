import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { db, userAvatars, users } from "@/lib/db";
import { parseImageUpload, toPublicImageUrl } from "@/lib/uploads/image-upload";

// POST /api/users/me/avatar - upload a custom profile photo. The bytes are
// stored in `user_avatars` (one row per user, upserted) and `users.image` is
// pointed at the public serve route GET /api/avatar/<userId>. No external
// storage - the database is the store. Validation + sniffing live in the shared
// image-upload helper (2 MB cap, jpg/png/webp by magic bytes).

export async function POST(request: Request): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

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

  // Root-relative on purpose: decouples the stored value from the writer's
  // deployment origin so a bot uploaded on `next dev` still renders in
  // production. `?v=` busts any cached copy of the (otherwise stable) avatar
  // URL so a new upload shows immediately on the chat header and dashboard.
  const storedImage = `/api/avatar/${userId}?v=${Date.now()}`;

  await db.transaction(async (tx) => {
    await tx
      .insert(userAvatars)
      .values({ userId, data: buffer, contentType })
      .onConflictDoUpdate({
        target: userAvatars.userId,
        set: { data: buffer, contentType, updatedAt: new Date() },
      });
    await tx.update(users).set({ image: storedImage }).where(eq(users.id, userId));
  });

  // Return the display-ready (absolutized) URL so the client updates its UI
  // without a re-fetch through the config API.
  return NextResponse.json({ image: toPublicImageUrl(storedImage) });
}
