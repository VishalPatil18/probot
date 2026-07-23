import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireBotOwnerMock = vi.fn();
const findFirstMock = vi.fn();
const selectMock = vi.fn();

vi.mock("@/lib/bots/require-bot-owner", () => ({
  requireBotOwner: (...args: unknown[]) => requireBotOwnerMock(...args),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      conversations: {
        findFirst: (...args: unknown[]) => findFirstMock(...args),
      },
    },
    select: (...args: unknown[]) => selectMock(...args),
  },
  conversations: { id: "c.id", botId: "c.bot_id" },
  messages: {
    id: "m.id",
    conversationId: "m.conv_id",
    role: "m.role",
    content: "m.content",
    createdAt: "m.created_at",
  },
}));

import { GET } from "./route";

const BOT_ID = "11111111-1111-1111-1111-111111111111";
const CONV_ID = "22222222-2222-2222-2222-222222222222";
const PARAMS = { params: { botId: BOT_ID, convId: CONV_ID } };

function chainResolving(value: unknown) {
  const chain: Record<string, unknown> = {};
  const ret = () => chain;
  chain.from = ret;
  chain.where = ret;
  chain.orderBy = ret;
  chain.then = (resolve: (v: unknown) => void) => resolve(value);
  return chain;
}

function ownerOk() {
  return { ok: true as const, bot: { id: BOT_ID }, userId: "u-1" };
}

describe("GET /api/bots/[botId]/conversations/[convId]", () => {
  beforeEach(() => {
    requireBotOwnerMock.mockReset();
    findFirstMock.mockReset();
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

  it("returns 404 when the conversation is not found", async () => {
    requireBotOwnerMock.mockResolvedValueOnce(ownerOk());
    findFirstMock.mockResolvedValueOnce(undefined);
    const res = await GET(new Request("http://localhost/"), PARAMS);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("conversation_not_found");
  });

  it("returns 404 when the conversation belongs to a different bot (tenant isolation)", async () => {
    requireBotOwnerMock.mockResolvedValueOnce(ownerOk());
    findFirstMock.mockResolvedValueOnce(undefined);
    const res = await GET(new Request("http://localhost/"), PARAMS);
    expect(res.status).toBe(404);
  });

  it("returns the conversation with messages embedded in chronological order", async () => {
    requireBotOwnerMock.mockResolvedValueOnce(ownerOk());
    findFirstMock.mockResolvedValueOnce({
      id: CONV_ID,
      sessionId: "ses-1",
      recruiterEmail: null,
      messageCount: 4,
      startedAt: new Date("2026-06-01T00:00:00Z"),
      lastMessageAt: new Date("2026-06-01T00:05:00Z"),
      botId: BOT_ID,
    });
    selectMock.mockReturnValueOnce(
      chainResolving([
        {
          id: "m1",
          role: "user",
          content: "hi",
          createdAt: new Date("2026-06-01T00:00:00Z"),
        },
        {
          id: "m2",
          role: "assistant",
          content: "hello!",
          createdAt: new Date("2026-06-01T00:00:01Z"),
        },
      ]),
    );

    const res = await GET(new Request("http://localhost/"), PARAMS);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      id: string;
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.id).toBe(CONV_ID);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0]).toMatchObject({ role: "user", content: "hi" });
    expect(body.messages[1]).toMatchObject({
      role: "assistant",
      content: "hello!",
    });
  });
});
