// In-memory two-tier rate limiter, scoped per botId.
//
// Sliding window: we keep an array of request timestamps per bot. On each
// check, we prune entries outside the window, then test the count against
// the cap. If under, we record the new timestamp and return ok. The same
// timestamp counts toward BOTH the minute and day buckets so we use two
// independent maps.
//
// This is in-memory and per-process. Vercel/serverless cold-starts naturally
// bound memory; Stage 8 replaces this with Upstash Redis per plan.md §7.4.
//
// Stage 7 §FR-010.9: per-bot overrides are accepted at call time. Each bot
// row can store its own perMinute / perDay / maxChars in the `bots` table.
// The route reads those columns and passes them in; NULL on the row means
// the env-var default still wins. Keeping the env vars as the floor means
// self-host operators tune the baseline without touching every bot row.

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

export const PER_MINUTE_DEFAULT = Number(
  process.env.PROBOT_RATE_PER_MINUTE ?? 10,
);
export const PER_DAY_DEFAULT = Number(process.env.PROBOT_RATE_PER_DAY ?? 50);
export const MAX_CHARS_DEFAULT = Number(
  process.env.PROBOT_RATE_MAX_CHARS ?? 8000,
);

// Sanity caps so a creator with a fat-finger can't set perMinute=999999 and
// effectively disable the limiter. Self-host operators can raise these by
// editing the constants; managed ProBot.dev keeps them tight to protect
// every recruiter-facing chat from runaway costs on the creator's BYO key.
export const PER_MINUTE_MAX = 100;
export const PER_DAY_MAX = 5_000;
export const MAX_CHARS_MAX = 32_000;

const minuteBuckets = new Map<string, number[]>();
const dayBuckets = new Map<string, number[]>();

export type RateLimitScope = "per_minute" | "per_day";

export type RateLimitResult =
  | { ok: true }
  | { ok: false; scope: RateLimitScope; resetAt: number };

export interface RateLimitOverrides {
  perMinute?: number | null;
  perDay?: number | null;
}

function clampPositive(value: number | null | undefined, fallback: number, ceiling: number): number {
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

function pruneAndCheck(
  bucket: Map<string, number[]>,
  key: string,
  now: number,
  windowMs: number,
  cap: number,
): { allowed: boolean; resetAt: number } {
  const stamps = bucket.get(key) ?? [];
  const cutoff = now - windowMs;
  let firstIn = 0;
  // Strictly older than the window - boundary entries are still live.
  while (firstIn < stamps.length && stamps[firstIn]! < cutoff) firstIn++;
  const live = firstIn === 0 ? stamps : stamps.slice(firstIn);

  if (live.length >= cap) {
    if (live !== stamps) bucket.set(key, live);
    const oldest = live[0] ?? now;
    return { allowed: false, resetAt: oldest + windowMs };
  }

  // Immutable append - avoids both the in-place mutation and the
  // concurrent-millisecond rollback hazard.
  bucket.set(key, [...live, now]);
  return { allowed: true, resetAt: 0 };
}

export function checkRateLimit(
  botId: string,
  overridesOrNow?: RateLimitOverrides | number,
  maybeNow?: number,
): RateLimitResult {
  // Backwards-compatible call shape: checkRateLimit(botId) and
  // checkRateLimit(botId, now) both still work. The Stage 7 signature is
  // checkRateLimit(botId, overrides, now?).
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

  // Check per-minute first; if that fails we don't want to consume a per-day slot.
  const minute = pruneAndCheck(
    minuteBuckets,
    botId,
    now,
    MINUTE_MS,
    perMinute,
  );
  if (!minute.allowed) {
    return { ok: false, scope: "per_minute", resetAt: minute.resetAt };
  }

  const day = pruneAndCheck(dayBuckets, botId, now, DAY_MS, perDay);
  if (!day.allowed) {
    // Roll back the per-minute slot we just consumed so the minute counter
    // doesn't double-charge a request we ultimately rejected. Immutable:
    // produce a fresh array rather than popping in place.
    const minuteStamps = minuteBuckets.get(botId) ?? [];
    if (minuteStamps[minuteStamps.length - 1] === now) {
      minuteBuckets.set(botId, minuteStamps.slice(0, -1));
    }
    return { ok: false, scope: "per_day", resetAt: day.resetAt };
  }

  return { ok: true };
}

// Legacy alias kept so existing imports of PER_MINUTE / PER_DAY don't break
// while a follow-up moves callers to the *_DEFAULT names. The dashboard
// "current limits" panel imports these, so renaming everywhere in one PR
// would unnecessarily widen the diff.
export const PER_MINUTE = PER_MINUTE_DEFAULT;
export const PER_DAY = PER_DAY_DEFAULT;

// Test helper. Not exported for production callers.
export function __resetRateLimitState(): void {
  minuteBuckets.clear();
  dayBuckets.clear();
}
