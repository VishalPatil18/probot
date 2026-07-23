import { createHmac, timingSafeEqual } from "crypto";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface Payload {
  botId: string;
  userId: string;
  iat: number;
}

export type PreviewTokenPayload = Pick<Payload, "botId" | "userId">;

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "NEXTAUTH_SECRET is not set - preview tokens cannot be signed",
    );
  }
  return secret;
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64url");
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

function sign(payloadEncoded: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadEncoded).digest("base64url");
}

export function mintPreviewToken(botId: string, userId: string): string {
  const secret = getSecret();
  const payload: Payload = { botId, userId, iat: Date.now() };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encoded, secret);
  return `${encoded}.${signature}`;
}

export function verifyPreviewToken(
  token: string,
): PreviewTokenPayload | null {
  const dot = token.indexOf(".");
  if (dot <= 0 || dot >= token.length - 1) return null;
  const encoded = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);

  const secret = getSecret();
  const expectedSig = sign(encoded, secret);

  const provided = base64UrlDecode(providedSig);
  const expected = base64UrlDecode(expectedSig);
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  let payload: Payload;
  try {
    const json = base64UrlDecode(encoded).toString("utf8");
    payload = JSON.parse(json) as Payload;
  } catch {
    return null;
  }

  if (
    typeof payload.botId !== "string" ||
    typeof payload.userId !== "string" ||
    typeof payload.iat !== "number"
  ) {
    return null;
  }
  if (Date.now() - payload.iat > TTL_MS) return null;

  return { botId: payload.botId, userId: payload.userId };
}
