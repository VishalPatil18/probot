import { afterEach, describe, expect, it } from "vitest";

import { buildTokenUrl, generateRawToken, hashToken } from "./tokens";

describe("generateRawToken", () => {
  it("returns a 64-char hex string (32 random bytes)", () => {
    const token = generateRawToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[a-f0-9]+$/);
  });

  it("returns distinct tokens across calls", () => {
    const a = generateRawToken();
    const b = generateRawToken();
    expect(a).not.toBe(b);
  });
});

describe("hashToken", () => {
  it("returns a deterministic SHA-256 hex digest", () => {
    const a = hashToken("hello");
    const b = hashToken("hello");
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it("differs for different inputs", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });

  it("never returns the raw token unchanged", () => {
    const raw = generateRawToken();
    expect(hashToken(raw)).not.toBe(raw);
  });
});

describe("buildTokenUrl", () => {
  const original = {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    APP_URL: process.env.APP_URL,
  };

  afterEach(() => {
    process.env.NEXTAUTH_URL = original.NEXTAUTH_URL;
    process.env.APP_URL = original.APP_URL;
  });

  it("uses NEXTAUTH_URL when set", () => {
    process.env.NEXTAUTH_URL = "https://probot.dev";
    delete process.env.APP_URL;
    const url = buildTokenUrl({ path: "/reset-password", token: "abc" });
    expect(url).toBe("https://probot.dev/reset-password?token=abc");
  });

  it("falls back to APP_URL when NEXTAUTH_URL is missing", () => {
    delete process.env.NEXTAUTH_URL;
    process.env.APP_URL = "https://app.example.com";
    const url = buildTokenUrl({ path: "/x", token: "t" });
    expect(url).toBe("https://app.example.com/x?token=t");
  });

  it("falls back to localhost when no env is set", () => {
    delete process.env.NEXTAUTH_URL;
    delete process.env.APP_URL;
    const url = buildTokenUrl({ path: "/x", token: "t" });
    expect(url).toBe("http://localhost:3000/x?token=t");
  });

  it("strips a trailing slash on the base URL", () => {
    process.env.NEXTAUTH_URL = "https://probot.dev/";
    const url = buildTokenUrl({ path: "/x", token: "t" });
    expect(url).toBe("https://probot.dev/x?token=t");
  });

  it("normalizes a path missing the leading slash", () => {
    process.env.NEXTAUTH_URL = "https://probot.dev";
    const url = buildTokenUrl({ path: "x", token: "t" });
    expect(url).toBe("https://probot.dev/x?token=t");
  });

  it("URL-encodes the token", () => {
    process.env.NEXTAUTH_URL = "https://probot.dev";
    const url = buildTokenUrl({ path: "/x", token: "a b/c?d" });
    expect(url).toBe("https://probot.dev/x?token=a%20b%2Fc%3Fd");
  });
});
