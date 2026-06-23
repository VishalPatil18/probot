import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstBotTokens = vi.fn();
const findFirstBots = vi.fn();
const insertReturning = vi.fn();
const updateReturning = vi.fn();

vi.mock("@/lib/db", () => ({
  // Column stubs are enough for the drizzle operators used here (eq) - they
  // store the reference and only build SQL at query time, which the mock skips.
  botTokens: {
    id: "bot_tokens.id",
    botId: "bot_tokens.bot_id",
    tokenHash: "bot_tokens.token_hash",
    revokedAt: "bot_tokens.revoked_at",
    createdAt: "bot_tokens.created_at",
  },
  bots: { id: "bots.id" },
  db: {
    query: {
      botTokens: {
        findFirst: (...args: unknown[]) => findFirstBotTokens(...args),
      },
      bots: { findFirst: (...args: unknown[]) => findFirstBots(...args) },
    },
    insert: () => ({
      values: () => ({ returning: () => insertReturning() }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({ returning: () => updateReturning() }),
      }),
    }),
  },
}));

import {
  authenticateBotToken,
  mintBotToken,
  revokeBotToken,
} from "./service";

// A syntactically valid raw token: pbt_ + 64 hex chars.
const VALID_RAW = `pbt_${"a".repeat(64)}`;

function authHeaders(value: string): Headers {
  return new Headers({ authorization: value });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("mintBotToken", () => {
  it("returns a pbt_-prefixed secret once and persists only its hash", async () => {
    insertReturning.mockResolvedValueOnce([{ id: "tok-1" }]);
    const result = await mintBotToken("bot-1", "My laptop");
    expect(result.id).toBe("tok-1");
    expect(result.rawToken).toMatch(/^pbt_[0-9a-f]{64}$/);
  });
});

describe("authenticateBotToken", () => {
  it("rejects a missing Authorization header without touching the DB", async () => {
    const res = await authenticateBotToken(new Headers());
    expect(res).toEqual({ ok: false, status: 401, error: "missing_bot_token" });
    expect(findFirstBotTokens).not.toHaveBeenCalled();
  });

  it("rejects a malformed token (wrong prefix / length)", async () => {
    const res = await authenticateBotToken(authHeaders("Bearer nope_123"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("missing_bot_token");
    expect(findFirstBotTokens).not.toHaveBeenCalled();
  });

  it("rejects an unknown token", async () => {
    findFirstBotTokens.mockResolvedValueOnce(undefined);
    const res = await authenticateBotToken(authHeaders(`Bearer ${VALID_RAW}`));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("invalid_bot_token");
  });

  it("rejects a revoked token", async () => {
    findFirstBotTokens.mockResolvedValueOnce({
      id: "tok-1",
      botId: "bot-1",
      revokedAt: new Date(),
    });
    const res = await authenticateBotToken(authHeaders(`Bearer ${VALID_RAW}`));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("invalid_bot_token");
    expect(findFirstBots).not.toHaveBeenCalled();
  });

  it("resolves a valid token to its bot and bumps last-seen", async () => {
    findFirstBotTokens.mockResolvedValueOnce({
      id: "tok-1",
      botId: "bot-1",
      revokedAt: null,
    });
    findFirstBots.mockResolvedValueOnce({ id: "bot-1", name: "Demo" });
    const res = await authenticateBotToken(authHeaders(`Bearer ${VALID_RAW}`));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.bot.id).toBe("bot-1");
      expect(res.tokenId).toBe("tok-1");
    }
  });
});

describe("revokeBotToken", () => {
  it("returns true when a still-active token was flipped", async () => {
    updateReturning.mockResolvedValueOnce([{ id: "tok-1" }]);
    expect(await revokeBotToken("bot-1", "tok-1")).toBe(true);
  });

  it("returns false when nothing matched (already revoked / not owned)", async () => {
    updateReturning.mockResolvedValueOnce([]);
    expect(await revokeBotToken("bot-1", "tok-x")).toBe(false);
  });
});
