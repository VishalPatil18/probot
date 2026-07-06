// Shared parsing + validation for avatar/photo uploads (user profile photos
// and bot pictures). Validation is sniff-authoritative: a file is accepted iff
// its magic bytes are a JPEG (.jpg/.jpeg), PNG, or WebP, and the *sniffed* type
// is what we store - the browser's declared MIME is ignored (it can be
// "image/jpg", empty, or spoofed). 2 MB cap. No external storage; callers
// persist the returned buffer to a bytea column.

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export type ParsedImage =
  | { ok: true; buffer: Buffer; contentType: string }
  | { ok: false; error: string; status: number };

// Magic-byte sniff for the three supported formats; returns the canonical MIME
// or null when the bytes are not a supported image.
export function sniffImageType(buf: Buffer): string | null {
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

// Absolute origin for building public serve URLs (OG meta tags, cross-origin
// widget config responses). Mirrors tokens.ts base logic. Must NEVER be used
// at write time - avatar rows are stored as root-relative paths so a bot
// created on localhost still renders in production after redeploy.
export function appBaseUrl(): string {
  const base =
    process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "http://localhost:3000";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

// Normalizes a stored image URL into a form safe to hand to a cross-origin
// consumer (widget, self-hosted runtime). Handles three shapes:
//   1. null / empty        -> null
//   2. absolute URL        -> passed through unchanged (Cloudinary OAuth, etc.)
//   3. root-relative path  -> prepended with appBaseUrl()
//
// Also self-heals legacy rows that were persisted with a hard-coded
// `http://localhost:3000` prefix (a bug in older builds where `appBaseUrl()`
// was called at write time inside `next dev`). Those get their dev prefix
// stripped and re-absolutized against the current deployment origin. No DB
// migration required - every reader that goes through this helper fixes the
// row for the caller.
export function toPublicImageUrl(raw: string | null | undefined): string | null {
  if (typeof raw !== "string" || raw.length === 0) return null;

  // Self-heal known dev-origin leaks. Match any localhost:* variant defensively
  // so a different dev port (e.g. 3001) also gets rewritten.
  const stripped = raw.replace(/^https?:\/\/localhost(?::\d+)?/i, "");

  // Root-relative → absolutize against the current deployment origin.
  if (stripped.startsWith("/")) return `${appBaseUrl()}${stripped}`;

  // Absolute (Cloudinary, external OAuth avatar) → trust as-is.
  return stripped;
}

// Pulls the "file" field from a multipart form and validates it. Returns the
// buffer + sniffed content-type, or a discriminated error with an HTTP status.
export async function parseImageUpload(form: FormData): Promise<ParsedImage> {
  const file = form.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "no_file", status: 400 };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, error: "file_too_large", status: 413 };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = sniffImageType(buffer);
  if (!contentType) {
    return { ok: false, error: "unsupported_type", status: 415 };
  }
  return { ok: true, buffer, contentType };
}
