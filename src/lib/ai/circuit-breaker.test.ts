import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProviderError } from "@/lib/ai/providers";
import { __resetRedisClient, __setRedisClientForTests } from "@/lib/store/redis";
import type { RedisLike } from "@/lib/store/redis";

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

describe("callWithBreaker (in-memory)", () => {
  beforeEach(async () => {
    await __resetCircuit();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await __resetCircuit();
  });

  it("starts in `closed` state and lets calls through", async () => {
    expect(await getCircuitState("p1")).toBe("closed");
    const out = await callWithBreaker("p1", passingFn(), OPTS);
    expect(out).toBe("ok");
    expect(await getCircuitState("p1")).toBe("closed");
  });

  it("propagates the underlying error on a single failure", async () => {
    await expect(
      callWithBreaker("p1", failingFn("network"), OPTS),
    ).rejects.toThrow("network");
    expect(await getCircuitState("p1")).toBe("closed");
  });

  it("opens after `failureThreshold` consecutive failures", async () => {
    for (let i = 0; i < OPTS.failureThreshold; i++) {
      await expect(callWithBreaker("p1", failingFn(), OPTS)).rejects.toThrow();
    }
    expect(await getCircuitState("p1")).toBe("open");
  });

  it("rejects immediately with circuit_open while open", async () => {
    for (let i = 0; i < OPTS.failureThreshold; i++) {
      await expect(callWithBreaker("p1", failingFn(), OPTS)).rejects.toThrow();
    }
    const fn = vi.fn(passingFn());
    await expect(callWithBreaker("p1", fn, OPTS)).rejects.toMatchObject({
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
      await expect(callWithBreaker("p1", failingFn(), OPTS)).rejects.toThrow();
    }
    expect(await getCircuitState("p1")).toBe("open");

    vi.setSystemTime(
      new Date("2026-06-20T00:00:00Z").getTime() + OPTS.resetTimeoutMs + 1,
    );
    const out = await callWithBreaker("p1", passingFn(), OPTS);
    expect(out).toBe("ok");
    expect(await getCircuitState("p1")).toBe("closed");
  });

  it("re-opens immediately when the half-open probe fails", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T00:00:00Z"));

    for (let i = 0; i < OPTS.failureThreshold; i++) {
      await expect(callWithBreaker("p1", failingFn(), OPTS)).rejects.toThrow();
    }
    vi.setSystemTime(
      new Date("2026-06-20T00:00:00Z").getTime() + OPTS.resetTimeoutMs + 1,
    );
    await expect(
      callWithBreaker("p1", failingFn("still down"), OPTS),
    ).rejects.toThrow("still down");
    expect(await getCircuitState("p1")).toBe("open");
  });

  it("isolates state per provider name", async () => {
    for (let i = 0; i < OPTS.failureThreshold; i++) {
      await expect(callWithBreaker("p1", failingFn(), OPTS)).rejects.toThrow();
    }
    expect(await getCircuitState("p1")).toBe("open");
    expect(await getCircuitState("p2")).toBe("closed");
    const out = await callWithBreaker("p2", passingFn(), OPTS);
    expect(out).toBe("ok");
  });

  it("a successful call mid-streak resets the failure count", async () => {
    await expect(callWithBreaker("p1", failingFn(), OPTS)).rejects.toThrow();
    await expect(callWithBreaker("p1", failingFn(), OPTS)).rejects.toThrow();
    await callWithBreaker("p1", passingFn(), OPTS);
    await expect(callWithBreaker("p1", failingFn(), OPTS)).rejects.toThrow();
    await expect(callWithBreaker("p1", failingFn(), OPTS)).rejects.toThrow();
    expect(await getCircuitState("p1")).toBe("closed");
  });

  it("respects halfOpenMaxCalls = 1 by rejecting concurrent probes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T00:00:00Z"));

    for (let i = 0; i < OPTS.failureThreshold; i++) {
      await expect(callWithBreaker("p1", failingFn(), OPTS)).rejects.toThrow();
    }
    vi.setSystemTime(
      new Date("2026-06-20T00:00:00Z").getTime() + OPTS.resetTimeoutMs + 1,
    );

    let resolveProbe: ((v: string) => void) | undefined;
    const slowProbe = callWithBreaker(
      "p1",
      () =>
        new Promise<string>((resolve) => {
          resolveProbe = resolve;
        }),
      OPTS,
    );
    // Let the probe register its half-open in-flight slot before the 2nd call.
    await Promise.resolve();

    await expect(callWithBreaker("p1", passingFn(), OPTS)).rejects.toMatchObject(
      {
        name: "ProviderError",
        message: "circuit_open",
      },
    );

    if (resolveProbe) resolveProbe("first-probe-ok");
    await expect(slowProbe).resolves.toBe("first-probe-ok");
    expect(await getCircuitState("p1")).toBe("closed");
  });

  it("fires onOpen exactly once when the circuit transitions to open", async () => {
    const onOpen = vi.fn();
    const opts = { ...OPTS, onOpen };
    for (let i = 0; i < OPTS.failureThreshold; i++) {
      await expect(callWithBreaker("p1", failingFn(), opts)).rejects.toThrow();
    }
    expect(await getCircuitState("p1")).toBe("open");
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith("p1");

    // Further rejected calls while already open must NOT re-fire onOpen.
    await expect(callWithBreaker("p1", failingFn(), opts)).rejects.toThrow();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe("ProviderError shape for circuit_open", () => {
  beforeEach(async () => {
    await __resetCircuit();
  });

  it("emits a ProviderError so the chat route's existing instanceof check works", async () => {
    for (let i = 0; i < OPTS.failureThreshold; i++) {
      await expect(callWithBreaker("p1", failingFn(), OPTS)).rejects.toThrow();
    }
    try {
      await callWithBreaker("p1", passingFn(), OPTS);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError);
    }
  });
});

// ---- Redis-backed path ----------------------------------------------------

// Fake of the GET/SET the breaker store performs via eval, plus del.
function makeFakeRedis(): RedisLike {
  const kv = new Map<string, string>();
  return {
    async eval(script, keys, args) {
      const key = keys[0] ?? "";
      if (script.includes("GET")) return (kv.get(key) ?? null) as never;
      if (script.includes("SET")) {
        kv.set(key, String(args[0]));
        return 1 as never;
      }
      return null as never;
    },
    async del(...keys) {
      let n = 0;
      for (const k of keys) if (kv.delete(k)) n++;
      return n;
    },
  };
}

describe("callWithBreaker (Redis-backed)", () => {
  beforeEach(() => {
    __setRedisClientForTests(makeFakeRedis());
  });
  afterEach(() => {
    __resetRedisClient();
  });

  it("opens after the threshold using shared Redis state", async () => {
    for (let i = 0; i < OPTS.failureThreshold; i++) {
      await expect(callWithBreaker("rp", failingFn(), OPTS)).rejects.toThrow();
    }
    expect(await getCircuitState("rp")).toBe("open");
  });

  it("fires onOpen once on the opening transition", async () => {
    const onOpen = vi.fn();
    const opts = { ...OPTS, onOpen };
    for (let i = 0; i < OPTS.failureThreshold; i++) {
      await expect(callWithBreaker("rp", failingFn(), opts)).rejects.toThrow();
    }
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith("rp");
  });
});
