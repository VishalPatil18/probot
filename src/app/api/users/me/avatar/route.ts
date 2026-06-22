import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { db, userAvatars, users } from "@/lib/db";

// POST /api/users/me/avatar - upload a custom profile photo. The bytes are
// stored in `user_avatars` (one row per user, upserted) and `users.image` is
// pointed at the public serve route GET /api/avatar/<userId>. No external
// storage - the database is the store (2 MB cap, jpg/png/webp only).

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Magic-byte sniff so a renamed/incorrect Content-Type can't smuggle a
// non-image through. Mirrors the upload-safety posture used for PDFs.
function sniffImageType(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function appBaseUrl(): string {
  const base =
    process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "http://localhost:3000";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

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

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageType(buffer);
  if (!sniffed || sniffed !== file.type) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  }

  // `?v=` busts any cached copy of the (otherwise stable) avatar URL so a new
  // upload shows immediately on the chat header and dashboard.
  const imageUrl = `${appBaseUrl()}/api/avatar/${userId}?v=${Date.now()}`;

  await db.transaction(async (tx) => {
    await tx
      .insert(userAvatars)
      .values({ userId, data: buffer, contentType: sniffed })
      .onConflictDoUpdate({
        target: userAvatars.userId,
        set: { data: buffer, contentType: sniffed, updatedAt: new Date() },
      });
    await tx.update(users).set({ image: imageUrl }).where(eq(users.id, userId));
  });

  return NextResponse.json({ image: imageUrl });
}
