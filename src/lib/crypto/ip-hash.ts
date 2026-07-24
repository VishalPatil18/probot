import { createHash } from "crypto";

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip || ip.length === 0) return null;
  const salt = process.env.NEXTAUTH_SECRET ?? "probot-default-ip-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function extractRequesterIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first && first.length > 0) return first;
  }
  return headers.get("x-real-ip") ?? null;
}
