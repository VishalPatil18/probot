import { Redis } from "@upstash/redis";

// Single point where the Upstash client is constructed. The rest of the app
// depends on the `RedisLike` interface below - not on `@upstash/redis` - so the
// shared-state logic stays unit-testable with a fake and the concrete package
// is imported in exactly one place.
//
// Returns `null` when the Upstash env vars are absent, which is the signal for
// callers to fall back to their in-process (in-memory) store. This keeps the
// default deployment zero-config and zero-cost; Redis is strictly opt-in.

// The subset of the Upstash Redis API the shared-state stores rely on. `eval`
// runs a Lua script atomically server-side (used for read-modify-write of both
// the rate-limit window and the breaker state).
export interface RedisLike {
  eval<TArgs extends (string | number)[], TResult>(
    script: string,
    keys: string[],
    args: TArgs,
  ): Promise<TResult>;
  del(...keys: string[]): Promise<number>;
}

let cached: RedisLike | null | undefined;

// Memoized so we build the REST client once per process. `undefined` means
// "not yet resolved"; `null` means "resolved: no Redis configured".
export function getRedisClient(): RedisLike | null {
  if (cached !== undefined) return cached;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    cached = null;
    return cached;
  }

  cached = new Redis({ url, token }) as unknown as RedisLike;
  return cached;
}

// Test/Reset seam: lets tests inject a fake client or clear the memo.
export function __setRedisClientForTests(client: RedisLike | null): void {
  cached = client;
}

export function __resetRedisClient(): void {
  cached = undefined;
}
