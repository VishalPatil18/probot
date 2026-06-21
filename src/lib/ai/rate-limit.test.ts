import { beforeEach, describe, expect, it } from "vitest";

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

describe("checkRateLimit - per-minute", () => {
  it("allows up to PER_MINUTE requests in a 60-second window", () => {
    for (let i = 0; i < PER_MINUTE; i++) {
      const r = checkRateLimit("bot-1", T0 + i * 100);
      expect(r.ok).toBe(true);
    }
    const next = checkRateLimit("bot-1", T0 + PER_MINUTE * 100);
    expect(next.ok).toBe(false);
    if (!next.ok) expect(next.scope).toBe("per_minute");
  });

  it("reports a resetAt within the next 60 seconds when minute-limited", () => {
    for (let i = 0; i < PER_MINUTE; i++) {
      checkRateLimit("bot-1", T0 + i);
    }
    const r = checkRateLimit("bot-1", T0 + PER_MINUTE);
    if (r.ok) throw new Error("expected blocked");
    expect(r.resetAt).toBeGreaterThan(T0);
    expect(r.resetAt).toBeLessThanOrEqual(T0 + 60_000 + PER_MINUTE);
  });

  it("releases the slot after the 60s window elapses (sliding window)", () => {
    for (let i = 0; i < PER_MINUTE; i++) {
      checkRateLimit("bot-1", T0 + i * 1000);
    }
    const r = checkRateLimit("bot-1", T0 + 61_000);
    expect(r.ok).toBe(true);
  });
});

describe("checkRateLimit - per-day", () => {
  it("allows up to PER_DAY requests in a 24h window", () => {
    for (let i = 0; i < PER_DAY; i++) {
      const r = checkRateLimit("bot-1", T0 + i * 10_000);
      expect(r.ok).toBe(true);
    }
    const next = checkRateLimit("bot-1", T0 + PER_DAY * 10_000);
    expect(next.ok).toBe(false);
    if (!next.ok) expect(next.scope).toBe("per_day");
  });

  it("releases slots after 24h", () => {
    for (let i = 0; i < PER_DAY; i++) {
      checkRateLimit("bot-1", T0 + i * 10_000);
    }
    const r = checkRateLimit("bot-1", T0 + PER_DAY * 10_000 + 86_400_001);
    expect(r.ok).toBe(true);
  });
});

describe("checkRateLimit - isolation", () => {
  it("treats distinct botIds as independent buckets", () => {
    for (let i = 0; i < PER_MINUTE; i++) {
      checkRateLimit("bot-1", T0 + i);
    }
    const a = checkRateLimit("bot-1", T0 + PER_MINUTE);
    const b = checkRateLimit("bot-2", T0 + PER_MINUTE);
    expect(a.ok).toBe(false);
    expect(b.ok).toBe(true);
  });
});

describe("checkRateLimit - per-bot overrides (Stage 7 §FR-010.9)", () => {
  it("honours a tighter perMinute override", () => {
    for (let i = 0; i < 3; i++) {
      const r = checkRateLimit("bot-1", { perMinute: 3 }, T0 + i * 1000);
      expect(r.ok).toBe(true);
    }
    const next = checkRateLimit("bot-1", { perMinute: 3 }, T0 + 3500);
    expect(next.ok).toBe(false);
    if (!next.ok) expect(next.scope).toBe("per_minute");
  });

  it("honours a looser perDay override above the env default", () => {
    // Lift perMinute too so the test isolates the per-day axis without the
    // per-minute limit firing first when timestamps land in the same minute.
    const looser = PER_DAY + 5;
    for (let i = 0; i < looser; i++) {
      const r = checkRateLimit(
        "bot-1",
        { perDay: looser, perMinute: 200 },
        T0 + i * 100,
      );
      expect(r.ok).toBe(true);
    }
    const next = checkRateLimit(
      "bot-1",
      { perDay: looser, perMinute: 200 },
      T0 + looser * 100,
    );
    expect(next.ok).toBe(false);
    if (!next.ok) expect(next.scope).toBe("per_day");
  });

  it("clamps an unreasonable perMinute to the safety ceiling", () => {
    // perMinute=100 is the ceiling. perDay must also be lifted above 100
    // so we observe the perMinute clamp rather than tripping the per-day
    // default of 50 first.
    for (let i = 0; i < 100; i++) {
      const r = checkRateLimit(
        "bot-1",
        { perMinute: 9999, perDay: 9999 },
        T0 + i,
      );
      expect(r.ok).toBe(true);
    }
    const next = checkRateLimit(
      "bot-1",
      { perMinute: 9999, perDay: 9999 },
      T0 + 100,
    );
    expect(next.ok).toBe(false);
  });

  it("treats undefined/null overrides as 'use env default'", () => {
    for (let i = 0; i < PER_MINUTE; i++) {
      checkRateLimit("bot-1", { perMinute: null }, T0 + i);
    }
    const next = checkRateLimit(
      "bot-1",
      { perMinute: undefined },
      T0 + PER_MINUTE,
    );
    expect(next.ok).toBe(false);
  });
});
