import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieMap = new Map<string, string>();
const cookiesMock = vi.fn(() => ({
  get: (name: string) => {
    const value = cookieMap.get(name);
    return value !== undefined ? { name, value } : undefined;
  },
  set: () => {
    /* noop */
  },
}));

vi.mock("next/headers", () => ({
  cookies: () => cookiesMock(),
}));

import {
  SELECTED_BOT_COOKIE,
  resolveSelectedBotId,
} from "./selected-bot";

describe("resolveSelectedBotId", () => {
  beforeEach(() => {
    cookieMap.clear();
  });

  it("returns null when the user has no bots", () => {
    expect(resolveSelectedBotId([], null)).toBe(null);
  });

  it("returns the cookie value when it matches an owned bot", () => {
    cookieMap.set(SELECTED_BOT_COOKIE, "bot-2");
    expect(
      resolveSelectedBotId(["bot-1", "bot-2", "bot-3"], "bot-1"),
    ).toBe("bot-2");
  });

  it("falls back to fallbackId when the cookie value is missing", () => {
    expect(resolveSelectedBotId(["bot-1", "bot-2"], "bot-1")).toBe(
      "bot-1",
    );
  });

  it("falls back to fallbackId when the cookie value is for a deleted bot", () => {
    cookieMap.set(SELECTED_BOT_COOKIE, "stale-bot");
    expect(
      resolveSelectedBotId(["bot-1", "bot-2"], "bot-1"),
    ).toBe("bot-1");
  });

  it("rejects a cookie pointing at a bot the user does not own (cross-tenant leak guard)", () => {
    cookieMap.set(SELECTED_BOT_COOKIE, "another-users-bot");
    expect(
      resolveSelectedBotId(["bot-1", "bot-2"], "bot-1"),
    ).toBe("bot-1");
  });

  it("falls back to the first valid bot when fallbackId is null", () => {
    expect(resolveSelectedBotId(["bot-a", "bot-b"], null)).toBe("bot-a");
  });
});
