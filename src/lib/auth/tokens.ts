import { createHash, randomBytes } from "crypto";

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
  const normalized = base.endsWith("/") ? base.slice(0, -1) : base;
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return `${normalized}${safePath}?token=${encodeURIComponent(token)}`;
}
