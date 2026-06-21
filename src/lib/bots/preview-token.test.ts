import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mintPreviewToken, verifyPreviewToken } from "./preview-token";

describe("preview-token", () => {
  const original = process.env.NEXTAUTH_SECRET;

  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = "test-secret-for-preview-token-suite";
  });

  afterEach(() => {
    process.env.NEXTAUTH_SECRET = original;
    vi.useRealTimers();
  });

  it("round-trips a payload through mint + verify", () => {
    const token = mintPreviewToken("bot-1", "user-1");
    const payload = verifyPreviewToken(token);
    expect(payload).toEqual({ botId: "bot-1", userId: "user-1" });
  });

  it("rejects a token signed with a different secret", () => {
    const token = mintPreviewToken("bot-1", "user-1");
    process.env.NEXTAUTH_SECRET = "different-secret";
    expect(verifyPreviewToken(token)).toBeNull();
  });

  it("rejects a token with a tampered payload", () => {
    const token = mintPreviewToken("bot-1", "user-1");
    const [, sig] = token.split(".");
    const tampered = `${Buffer.from(
      JSON.stringify({ botId: "other-bot", userId: "other-user", iat: Date.now() }),
      "utf8",
    ).toString("base64url")}.${sig}`;
    expect(verifyPreviewToken(tampered)).toBeNull();
  });

  it("rejects a token after the 7-day TTL", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T00:00:00Z"));
    const token = mintPreviewToken("bot-1", "user-1");
    vi.setSystemTime(new Date("2026-06-09T00:00:01Z"));
    expect(verifyPreviewToken(token)).toBeNull();
  });

  it("accepts a token on the boundary just under TTL", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T00:00:00Z"));
    const token = mintPreviewToken("bot-1", "user-1");
    vi.setSystemTime(new Date("2026-06-07T23:59:59Z"));
    expect(verifyPreviewToken(token)).toEqual({
      botId: "bot-1",
      userId: "user-1",
    });
  });

  it("returns null for malformed tokens", () => {
    expect(verifyPreviewToken("garbage")).toBeNull();
    expect(verifyPreviewToken("no-dot-here")).toBeNull();
    expect(verifyPreviewToken(".no-payload")).toBeNull();
    expect(verifyPreviewToken("payload.")).toBeNull();
  });

  it("throws when NEXTAUTH_SECRET is missing", () => {
    delete process.env.NEXTAUTH_SECRET;
    expect(() => mintPreviewToken("bot", "user")).toThrow(/NEXTAUTH_SECRET/);
  });
});
