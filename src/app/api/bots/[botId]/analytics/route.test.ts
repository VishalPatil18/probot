import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireBotOwnerMock = vi.fn();
const selectMock = vi.fn();

vi.mock("@/lib/bots/require-bot-owner", () => ({
  requireBotOwner: (...args: unknown[]) => requireBotOwnerMock(...args),
}));

vi.mock("@/lib/db", () => ({
  db: { select: (...args: unknown[]) => selectMock(...args) },
  conversations: { botId: "c.bot_id", startedAt: "c.started_at", id: "c.id" },
  messages: { conversationId: "m.conv_id" },
  leads: { botId: "l.bot_id", capturedAt: "l.captured_at" },
}));

import { GET } from "./route";

const BOT_ID = "11111111-1111-1111-1111-111111111111";
const PARAMS = { params: { botId: BOT_ID } };

function chainResolving(value: unknown) {
  const chain: Record<string, unknown> = {};
  const ret = () => chain;
  chain.from = ret;
  chain.innerJoin = ret;
  chain.where = ret;
  chain.then = (resolve: (v: unknown) => void) => resolve(value);
  return chain;
}

describe("GET /api/bots/[botId]/analytics", () => {
  beforeEach(() => {
    requireBotOwnerMock.mockReset();
    selectMock.mockReset();
  });

  it("returns 401 when requireBotOwner fails", async () => {
    requireBotOwnerMock.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET(new Request("http://localhost/"), PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns the five-metric overview on the happy path", async () => {
    requireBotOwnerMock.mockResolvedValueOnce({
      ok: true,
      bot: { id: BOT_ID },
      userId: "u-1",
    });
    selectMock
      .mockReturnValueOnce(chainResolving([{ total: 42, thisMonth: 9 }]))
      .mockReturnValueOnce(chainResolving([{ total: 137 }]))
      .mockReturnValueOnce(chainResolving([{ total: 7, thisMonth: 3 }]));

    const res = await GET(new Request("http://localhost/"), PARAMS);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, number>;
    expect(body).toEqual({
      totalConversations: 42,
      totalMessages: 137,
      totalLeads: 7,
      conversationsThisMonth: 9,
      leadsThisMonth: 3,
    });
  });

  it("returns zeros when the bot has no activity yet", async () => {
    requireBotOwnerMock.mockResolvedValueOnce({
      ok: true,
      bot: { id: BOT_ID },
      userId: "u-1",
    });
    selectMock
      .mockReturnValueOnce(chainResolving([]))
      .mockReturnValueOnce(chainResolving([]))
      .mockReturnValueOnce(chainResolving([]));

    const res = await GET(new Request("http://localhost/"), PARAMS);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, number>;
    expect(body).toEqual({
      totalConversations: 0,
      totalMessages: 0,
      totalLeads: 0,
      conversationsThisMonth: 0,
      leadsThisMonth: 0,
    });
  });
});
