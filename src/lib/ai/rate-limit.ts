import { getRedisClient, type RedisLike } from "@/lib/store/redis";

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

export const PER_MINUTE_DEFAULT = Number(
  process.env.PROBOT_RATE_PER_MINUTE ?? 10,
);
export const PER_DAY_DEFAULT = Number(process.env.PROBOT_RATE_PER_DAY ?? 50);
export const MAX_CHARS_DEFAULT = Number(
  process.env.PROBOT_RATE_MAX_CHARS ?? 8000,
);

export const PER_MINUTE_MAX = 100;
export const PER_DAY_MAX = 5_000;
export const MAX_CHARS_MAX = 32_000;

export type RateLimitScope = "per_minute" | "per_day";

export type RateLimitResult =
  | { ok: true }
  | { ok: false; scope: RateLimitScope; resetAt: number };

export interface RateLimitOverrides {
  perMinute?: number | null;
  perDay?: number | null;
}

export type RateHit =
  | { allowed: true; token: string }
  | { allowed: false; resetAt: number };

export interface RateLimitStore {
  hit(
    key: string,
    windowMs: number,
    cap: number,
    now: number,
  ): Promise<RateHit>;
  rollback(key: string, token: string): Promise<void>;
}

function clampPositive(
  value: number | null | undefined,
  fallback: number,
  ceiling: number,
): number {
  if (value === null || value === undefined) return fallback;
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(Math.floor(value), ceiling);
}

export function resolveLimits(overrides?: RateLimitOverrides): {
  perMinute: number;
  perDay: number;
} {
  return {
    perMinute: clampPositive(
      overrides?.perMinute,
      PER_MINUTE_DEFAULT,
      PER_MINUTE_MAX,
    ),
    perDay: clampPositive(overrides?.perDay, PER_DAY_DEFAULT, PER_DAY_MAX),
  };
}

export function resolveMaxChars(maxChars: number | null | undefined): number {
  return clampPositive(maxChars, MAX_CHARS_DEFAULT, MAX_CHARS_MAX);
}

function makeToken(now: number): string {
  return `${now}-${Math.random().toString(36).slice(2, 10)}`;
}

class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, Array<{ ts: number; token: string }>>();

  async hit(
    key: string,
    windowMs: number,
    cap: number,
    now: number,
  ): Promise<RateHit> {
    const entries = this.buckets.get(key) ?? [];
    const cutoff = now - windowMs;
    const live = entries.filter((e) => e.ts >= cutoff);

    if (live.length >= cap) {
      if (live.length !== entries.length) this.buckets.set(key, live);
      const oldest = live[0]?.ts ?? now;
      return { allowed: false, resetAt: oldest + windowMs };
    }

    const token = makeToken(now);
    this.buckets.set(key, [...live, { ts: now, token }]);
    return { allowed: true, token };
  }

  async rollback(key: string, token: string): Promise<void> {
    const entries = this.buckets.get(key);
    if (!entries) return;
    const next = entries.filter((e) => e.token !== token);
    if (next.length !== entries.length) this.buckets.set(key, next);
  }

  clear(): void {
    this.buckets.clear();
  }
}

const HIT_SCRIPT = `
local cutoff = tonumber(ARGV[1]) - tonumber(ARGV[2])
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, cutoff - 1)
local count = redis.call('ZCARD', KEYS[1])
if count >= tonumber(ARGV[3]) then
  local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
  local resetAt = tonumber(oldest[2]) + tonumber(ARGV[2])
  return {0, resetAt}
end
redis.call('ZADD', KEYS[1], tonumber(ARGV[1]), ARGV[4])
redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[2]))
return {1, 0}
`;

class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly redis: RedisLike) {}

  async hit(
    key: string,
    windowMs: number,
    cap: number,
    now: number,
  ): Promise<RateHit> {
    const token = makeToken(now);
    const [allowed, resetAt] = await this.redis.eval<
      [number, number, number, string],
      [number, number]
    >(HIT_SCRIPT, [key], [now, windowMs, cap, token]);
    return allowed === 1
      ? { allowed: true, token }
      : { allowed: false, resetAt };
  }

  async rollback(key: string, token: string): Promise<void> {
    await this.redis.eval(`redis.call('ZREM', KEYS[1], ARGV[1]) return 1`, [key], [token]);
  }
}

const memoryStore = new MemoryRateLimitStore();

function getStore(): RateLimitStore {
  const redis = getRedisClient();
  return redis ? new RedisRateLimitStore(redis) : memoryStore;
}

function minuteKey(botId: string): string {
  return `rl:m:${botId}`;
}

function dayKey(botId: string): string {
  return `rl:d:${botId}`;
}

export async function checkRateLimit(
  botId: string,
  overridesOrNow?: RateLimitOverrides | number,
  maybeNow?: number,
): Promise<RateLimitResult> {
  let overrides: RateLimitOverrides | undefined;
  let now: number;
  if (typeof overridesOrNow === "number") {
    overrides = undefined;
    now = overridesOrNow;
  } else {
    overrides = overridesOrNow;
    now = maybeNow ?? Date.now();
  }

  const { perMinute, perDay } = resolveLimits(overrides);
  const store = getStore();

  const minute = await store.hit(minuteKey(botId), MINUTE_MS, perMinute, now);
  if (!minute.allowed) {
    return { ok: false, scope: "per_minute", resetAt: minute.resetAt };
  }

  const day = await store.hit(dayKey(botId), DAY_MS, perDay, now);
  if (!day.allowed) {
    await store.rollback(minuteKey(botId), minute.token);
    return { ok: false, scope: "per_day", resetAt: day.resetAt };
  }

  return { ok: true };
}

export const PER_MINUTE = PER_MINUTE_DEFAULT;
export const PER_DAY = PER_DAY_DEFAULT;

export function __resetRateLimitState(): void {
  memoryStore.clear();
}
