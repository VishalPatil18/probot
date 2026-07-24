export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export type ParsedImage =
  | { ok: true; buffer: Buffer; contentType: string }
  | { ok: false; error: string; status: number };

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

export function appBaseUrl(): string {
  const base =
    process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "http://localhost:3000";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export function toPublicImageUrl(raw: string | null | undefined): string | null {
  if (typeof raw !== "string" || raw.length === 0) return null;

  const stripped = raw.replace(/^https?:\/\/localhost(?::\d+)?/i, "");

  if (stripped.startsWith("/")) return `${appBaseUrl()}${stripped}`;

  return stripped;
}

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
