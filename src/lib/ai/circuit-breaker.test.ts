import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProviderError } from "@/lib/ai/providers";

import {
  __resetCircuit,
  callWithBreaker,
  getCircuitState,
} from "./circuit-breaker";

const OPTS = {
  failureThreshold: 3,
  resetTimeoutMs: 1000,
  halfOpenMaxCalls: 1,
};

function failingFn(message = "upstream is down"): () => Promise<never> {
  return async () => {
    throw new Error(message);
  };
}

function passingFn(): () => Promise<string> {
  return async () => "ok";
}

describe("callWithBreaker", () => {
  beforeEach(() => {
    __resetCircuit();
  });

  afterEach(() => {
    vi.useRealTimers();
    __resetCircuit();
  });

  it("starts in `closed` state and lets calls through", async () => {
    expect(getCircuitState("p1")).toBe("closed");
    const out = await callWithBreaker("p1", passingFn(), OPTS);
    expect(out).toBe("ok");
    expect(getCircuitState("p1")).toBe("closed");
  });

  it("propagates the underlying error on a single failure", async () => {
    await expect(
      callWithBreaker("p1", failingFn("network"), OPTS),
    ).rejects.toThrow("network");
    expect(getCircuitState("p1")).toBe("closed");
  });

  it("opens after `failureThreshold` consecutive failures", async () => {
    for (let i = 0; i < OPTS.failureThreshold; i++) {
      await expect(
        callWithBreaker("p1", failingFn(), OPTS),
      ).rejects.toThrow();
    }
    expect(getCircuitState("p1")).toBe("open");
  });

  it("rejects immediately with circuit_open while open", async () => {
    for (let i = 0; i < OPTS.failureThreshold; i++) {
      await expect(
        callWithBreaker("p1", failingFn(), OPTS),
      ).rejects.toThrow();
    }
    // The next call should NOT touch the function and should produce a
    // ProviderError with category "unknown" + message "circuit_open".
    const fn = vi.fn(passingFn());
    await expect(
      callWithBreaker("p1", fn, OPTS),
    ).rejects.toMatchObject({
      name: "ProviderError",
      category: "unknown",
      message: "circuit_open",
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it("resets to half-open after the cooldown elapses", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T00:00:00Z"));

    for (let i = 0; i < OPTS.failureThreshold; i++) {
      await expect(
        callWithBreaker("p1", failingFn(), OPTS),
      ).rejects.toThrow();
    }
    expect(getCircuitState("p1")).toBe("open");

    // Advance past the reset window. The next call should enter half-open
    // and pass the probe through. We let it succeed so the breaker closes.
    vi.setSystemTime(
      new Date("2026-06-20T00:00:00Z").getTime() + OPTS.resetTimeoutMs + 1,
    );
    const out = await callWithBreaker("p1", passingFn(), OPTS);
    expect(out).toBe("ok");
    expect(getCircuitState("p1")).toBe("closed");
  });

  it("re-opens immediately when the half-open probe fails", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T00:00:00Z"));

    for (let i = 0; i < OPTS.failureThreshold; i++) {
      await expect(
        callWithBreaker("p1", failingFn(), OPTS),
      ).rejects.toThrow();
    }
    vi.setSystemTime(
      new Date("2026-06-20T00:00:00Z").getTime() + OPTS.resetTimeoutMs + 1,
    );
    // Probe fails → straight back to open.
    await expect(
      callWithBreaker("p1", failingFn("still down"), OPTS),
    ).rejects.toThrow("still down");
    expect(getCircuitState("p1")).toBe("open");
  });

  it("isolates state per provider name", async () => {
    for (let i = 0; i < OPTS.failureThreshold; i++) {
      await expect(
        callWithBreaker("p1", failingFn(), OPTS),
      ).rejects.toThrow();
    }
    expect(getCircuitState("p1")).toBe("open");
    expect(getCircuitState("p2")).toBe("closed");
    const out = await callWithBreaker("p2", passingFn(), OPTS);
    expect(out).toBe("ok");
  });

  it("a successful call mid-streak resets the failure count", async () => {
    // 2 failures, then a success, then 2 more failures - should still be
    // closed because the success zeroed the counter.
    await expect(
      callWithBreaker("p1", failingFn(), OPTS),
    ).rejects.toThrow();
    await expect(
      callWithBreaker("p1", failingFn(), OPTS),
    ).rejects.toThrow();
    await callWithBreaker("p1", passingFn(), OPTS);
    await expect(
      callWithBreaker("p1", failingFn(), OPTS),
    ).rejects.toThrow();
    await expect(
      callWithBreaker("p1", failingFn(), OPTS),
    ).rejects.toThrow();
    expect(getCircuitState("p1")).toBe("closed");
  });

  it("respects halfOpenMaxCalls = 1 by rejecting concurrent probes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T00:00:00Z"));

    for (let i = 0; i < OPTS.failureThreshold; i++) {
      await expect(
        callWithBreaker("p1", failingFn(), OPTS),
      ).rejects.toThrow();
    }
    vi.setSystemTime(
      new Date("2026-06-20T00:00:00Z").getTime() + OPTS.resetTimeoutMs + 1,
    );

    // Kick off a probe that takes a long time to settle.
    let resolveProbe: ((v: string) => void) | undefined;
    const slowProbe = callWithBreaker(
      "p1",
      () =>
        new Promise<string>((resolve) => {
          resolveProbe = resolve;
        }),
      OPTS,
    );

    // A second probe attempted while the first is in-flight should fail
    // with circuit_open even though we are technically in half-open.
    await expect(
      callWithBreaker("p1", passingFn(), OPTS),
    ).rejects.toMatchObject({
      name: "ProviderError",
      message: "circuit_open",
    });

    // Finish the first probe successfully.
    if (resolveProbe) resolveProbe("first-probe-ok");
    await expect(slowProbe).resolves.toBe("first-probe-ok");
    expect(getCircuitState("p1")).toBe("closed");
  });
});

describe("ProviderError shape for circuit_open", () => {
  beforeEach(() => __resetCircuit());

  it("emits a ProviderError so the chat route's existing instanceof check works", async () => {
    for (let i = 0; i < OPTS.failureThreshold; i++) {
      await expect(
        callWithBreaker("p1", failingFn(), OPTS),
      ).rejects.toThrow();
    }
    try {
      await callWithBreaker("p1", passingFn(), OPTS);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError);
    }
  });
});
