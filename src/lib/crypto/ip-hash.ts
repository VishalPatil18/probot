import { createHash } from "crypto";

// Hash the recruiter IP before persisting it. We never want the raw IP in
// the database (PII / GDPR concern), but we do want to be able to answer
// "are these decrypts coming from the same source?" in the dashboard audit
// log. SHA-256 with a per-deploy salt is sufficient: rainbow-table-free
// for any reasonable IPv4 space, and ungroupable across deploys.
//
// The salt comes from NEXTAUTH_SECRET so we don't need yet another env var.
// Operators who rotate NEXTAUTH_SECRET get an unintended hash-rotation as
// a side effect; for the audit-log use case that's fine - older entries
// remain valid timestamps, they just don't compare-equal to newer hashes.

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip || ip.length === 0) return null;
  const salt = process.env.NEXTAUTH_SECRET ?? "probot-default-ip-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

// Pull the closest-to-recruiter IP from the request headers. Vercel / most
// proxies forward the client IP in `x-forwarded-for`. The first IP in the
// list is the originating client; everything after is the proxy chain.
export function extractRequesterIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first && first.length > 0) return first;
  }
  return headers.get("x-real-ip") ?? null;
}
