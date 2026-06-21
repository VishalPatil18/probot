import { createHash, randomBytes } from "crypto";

// Shared helpers for one-shot tokens (password reset, email verification).
// The raw token we email is high-entropy random bytes; only its SHA-256
// hash is persisted. A leaked DB dump cannot be replayed against the API.

export function generateRawToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

interface BuildLinkArgs {
  path: string;
  token: string;
}

export function buildTokenUrl({ path, token }: BuildLinkArgs): string {
  const base =
    process.env.NEXTAUTH_URL ??
    process.env.APP_URL ??
    "http://localhost:3000";
  // Strip a trailing slash so we don't end up with "//path".
  const normalized = base.endsWith("/") ? base.slice(0, -1) : base;
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return `${normalized}${safePath}?token=${encodeURIComponent(token)}`;
}
