// In-memory two-tier rate limiter, scoped per botId.
//
// Sliding window: we keep an array of request timestamps per bot. On each
// check, we prune entries outside the window, then test the count against
// the cap. If under, we record the new timestamp and return ok. The same
// timestamp counts toward BOTH the minute and day buckets so we use two
// independent maps.
//
// This is in-memory and per-process. Vercel/serverless cold-starts naturally
// bound memory; Stage 7 replaces this with Upstash Redis per plan.md §7.4
// (which also adds per-bot overrides via env / DB columns).

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

export const PER_MINUTE = Number(process.env.PROBOT_RATE_PER_MINUTE ?? 10);
export const PER_DAY = Number(process.env.PROBOT_RATE_PER_DAY ?? 50);

const minuteBuckets = new Map<string, number[]>();
const dayBuckets = new Map<string, number[]>();

export type RateLimitScope = "per_minute" | "per_day";

export type RateLimitResult =
  | { ok: true }
  | { ok: false; scope: RateLimitScope; resetAt: number };

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
  now: number = Date.now(),
): RateLimitResult {
  // Check per-minute first; if that fails we don't want to consume a per-day slot.
  const minute = pruneAndCheck(
    minuteBuckets,
    botId,
    now,
    MINUTE_MS,
    PER_MINUTE,
  );
  if (!minute.allowed) {
    return { ok: false, scope: "per_minute", resetAt: minute.resetAt };
  }

  const day = pruneAndCheck(dayBuckets, botId, now, DAY_MS, PER_DAY);
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

// Test helper. Not exported for production callers.
export function __resetRateLimitState(): void {
  minuteBuckets.clear();
  dayBuckets.clear();
}
