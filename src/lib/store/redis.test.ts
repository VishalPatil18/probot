import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { __resetRedisClient, getRedisClient } from "./redis";

const ENV_KEYS = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];

describe("getRedisClient", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) saved[k] = process.env[k];
    __resetRedisClient();
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    __resetRedisClient();
  });

  it("returns null when the Upstash env vars are absent", () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(getRedisClient()).toBeNull();
  });

  it("returns null when only one of the two vars is set", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(getRedisClient()).toBeNull();
  });

  it("builds and memoizes a client when both vars are set", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token-123";
    const a = getRedisClient();
    const b = getRedisClient();
    expect(a).not.toBeNull();
    expect(a).toBe(b);
  });
});
