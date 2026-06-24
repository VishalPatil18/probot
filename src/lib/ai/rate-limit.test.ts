import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { __resetRedisClient, __setRedisClientForTests } from "@/lib/store/redis";
import type { RedisLike } from "@/lib/store/redis";

import {
  PER_DAY,
  PER_MINUTE,
  __resetRateLimitState,
  checkRateLimit,
} from "./rate-limit";

beforeEach(() => {
  __resetRateLimitState();
});

const T0 = 1_700_000_000_000;

describe("checkRateLimit - per-minute (in-memory)", () => {
  it("allows up to PER_MINUTE requests in a 60-second window", async () => {
    for (let i = 0; i < PER_MINUTE; i++) {
      const r = await checkRateLimit("bot-1", T0 + i * 100);
      expect(r.ok).toBe(true);
    }
    const next = await checkRateLimit("bot-1", T0 + PER_MINUTE * 100);
    expect(next.ok).toBe(false);
    if (!next.ok) expect(next.scope).toBe("per_minute");
  });

  it("reports a resetAt within the next 60 seconds when minute-limited", async () => {
    for (let i = 0; i < PER_MINUTE; i++) {
      await checkRateLimit("bot-1", T0 + i);
    }
    const r = await checkRateLimit("bot-1", T0 + PER_MINUTE);
    if (r.ok) throw new Error("expected blocked");
    expect(r.resetAt).toBeGreaterThan(T0);
    expect(r.resetAt).toBeLessThanOrEqual(T0 + 60_000 + PER_MINUTE);
  });

  it("releases the slot after the 60s window elapses (sliding window)", async () => {
    for (let i = 0; i < PER_MINUTE; i++) {
      await checkRateLimit("bot-1", T0 + i * 1000);
    }
    const r = await checkRateLimit("bot-1", T0 + 61_000);
    expect(r.ok).toBe(true);
  });
});

describe("checkRateLimit - per-day (in-memory)", () => {
  it("allows up to PER_DAY requests in a 24h window", async () => {
    for (let i = 0; i < PER_DAY; i++) {
      const r = await checkRateLimit("bot-1", T0 + i * 10_000);
      expect(r.ok).toBe(true);
    }
    const next = await checkRateLimit("bot-1", T0 + PER_DAY * 10_000);
    expect(next.ok).toBe(false);
    if (!next.ok) expect(next.scope).toBe("per_day");
  });

  it("releases slots after 24h", async () => {
    for (let i = 0; i < PER_DAY; i++) {
      await checkRateLimit("bot-1", T0 + i * 10_000);
    }
    const r = await checkRateLimit("bot-1", T0 + PER_DAY * 10_000 + 86_400_001);
    expect(r.ok).toBe(true);
  });
});

describe("checkRateLimit - isolation", () => {
  it("treats distinct botIds as independent buckets", async () => {
    for (let i = 0; i < PER_MINUTE; i++) {
      await checkRateLimit("bot-1", T0 + i);
    }
    const a = await checkRateLimit("bot-1", T0 + PER_MINUTE);
    const b = await checkRateLimit("bot-2", T0 + PER_MINUTE);
    expect(a.ok).toBe(false);
    expect(b.ok).toBe(true);
  });
});

describe("checkRateLimit - per-bot overrides (Stage 7 §FR-010.9)", () => {
  it("honours a tighter perMinute override", async () => {
    for (let i = 0; i < 3; i++) {
      const r = await checkRateLimit("bot-1", { perMinute: 3 }, T0 + i * 1000);
      expect(r.ok).toBe(true);
    }
    const next = await checkRateLimit("bot-1", { perMinute: 3 }, T0 + 3500);
    expect(next.ok).toBe(false);
    if (!next.ok) expect(next.scope).toBe("per_minute");
  });

  it("honours a looser perDay override above the env default", async () => {
    const looser = PER_DAY + 5;
    for (let i = 0; i < looser; i++) {
      const r = await checkRateLimit(
        "bot-1",
        { perDay: looser, perMinute: 200 },
        T0 + i * 100,
      );
      expect(r.ok).toBe(true);
    }
    const next = await checkRateLimit(
      "bot-1",
      { perDay: looser, perMinute: 200 },
      T0 + looser * 100,
    );
    expect(next.ok).toBe(false);
    if (!next.ok) expect(next.scope).toBe("per_day");
  });

  it("clamps an unreasonable perMinute to the safety ceiling", async () => {
    for (let i = 0; i < 100; i++) {
      const r = await checkRateLimit(
        "bot-1",
        { perMinute: 9999, perDay: 9999 },
        T0 + i,
      );
      expect(r.ok).toBe(true);
    }
    const next = await checkRateLimit(
      "bot-1",
      { perMinute: 9999, perDay: 9999 },
      T0 + 100,
    );
    expect(next.ok).toBe(false);
  });

  it("treats undefined/null overrides as 'use env default'", async () => {
    for (let i = 0; i < PER_MINUTE; i++) {
      await checkRateLimit("bot-1", { perMinute: null }, T0 + i);
    }
    const next = await checkRateLimit(
      "bot-1",
      { perMinute: undefined },
      T0 + PER_MINUTE,
    );
    expect(next.ok).toBe(false);
  });
});

// ---- Redis-backed path ----------------------------------------------------

// Faithful in-JS fake of the sorted-set operations the rate limiter's Lua
// scripts perform, so the Redis code path is exercised without a live server.
// Identified by keyword: the HIT script ZADDs, the rollback script ZREMs.
function makeFakeRedis(): RedisLike {
  const sets = new Map<string, Map<string, number>>();
  return {
    async eval(script, keys, args) {
      const key = keys[0] ?? "";
      const zset = sets.get(key) ?? new Map<string, number>();
      if (script.includes("ZADD")) {
        const [now, windowMs, cap, member] = args as unknown as [
          number,
          number,
          number,
          string,
        ];
        for (const [m, score] of [...zset]) {
          if (score < now - windowMs) zset.delete(m);
        }
        if (zset.size >= cap) {
          const oldest = Math.min(...zset.values());
          sets.set(key, zset);
          return [0, oldest + windowMs] as never;
        }
        zset.set(member, now);
        sets.set(key, zset);
        return [1, 0] as never;
      }
      // rollback (ZREM)
      const [member] = args as unknown as [string];
      zset.delete(member);
      sets.set(key, zset);
      return 1 as never;
    },
    async del(...keys) {
      let n = 0;
      for (const k of keys) if (sets.delete(k)) n++;
      return n;
    },
  };
}

describe("checkRateLimit - Redis-backed", () => {
  beforeEach(() => {
    __setRedisClientForTests(makeFakeRedis());
  });
  afterEach(() => {
    __resetRedisClient();
  });

  it("enforces the per-minute cap across calls", async () => {
    for (let i = 0; i < PER_MINUTE; i++) {
      const r = await checkRateLimit("bot-r", T0 + i * 100);
      expect(r.ok).toBe(true);
    }
    const next = await checkRateLimit("bot-r", T0 + PER_MINUTE * 100);
    expect(next.ok).toBe(false);
    if (!next.ok) expect(next.scope).toBe("per_minute");
  });

  it("keeps distinct bots independent", async () => {
    for (let i = 0; i < PER_MINUTE; i++) {
      await checkRateLimit("bot-a", T0 + i);
    }
    const a = await checkRateLimit("bot-a", T0 + PER_MINUTE);
    const b = await checkRateLimit("bot-b", T0 + PER_MINUTE);
    expect(a.ok).toBe(false);
    expect(b.ok).toBe(true);
  });

  it("rolls back the minute slot when the day cap rejects", async () => {
    // perMinute high so the day axis fails first; perDay tiny so it trips.
    for (let i = 0; i < 2; i++) {
      await checkRateLimit("bot-c", { perMinute: 50, perDay: 2 }, T0 + i * 10);
    }
    const blocked = await checkRateLimit(
      "bot-c",
      { perMinute: 50, perDay: 2 },
      T0 + 30,
    );
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.scope).toBe("per_day");
    // The rejected request must not have consumed a minute slot: only the 2
    // allowed requests count, so a fresh request under a higher day cap is ok.
    const after = await checkRateLimit(
      "bot-c",
      { perMinute: 50, perDay: 50 },
      T0 + 40,
    );
    expect(after.ok).toBe(true);
  });
});
