import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireBotOwnerMock = vi.fn();
const selectMock = vi.fn();

vi.mock("@/lib/bots/require-bot-owner", () => ({
  requireBotOwner: (...args: unknown[]) => requireBotOwnerMock(...args),
}));

vi.mock("@/lib/db", () => ({
  db: { select: (...args: unknown[]) => selectMock(...args) },
  conversations: {
    botId: "c.bot_id",
    id: "c.id",
    sessionId: "c.session_id",
    recruiterEmail: "c.recruiter_email",
    messageCount: "c.message_count",
    startedAt: "c.started_at",
    lastMessageAt: "c.last_message_at",
  },
  messages: {
    conversationId: "m.conv_id",
    content: "m.content",
    role: "m.role",
    createdAt: "m.created_at",
  },
}));

import { GET } from "./route";

const BOT_ID = "11111111-1111-1111-1111-111111111111";
const PARAMS = { params: { botId: BOT_ID } };

function chainResolving(value: unknown) {
  const chain: Record<string, unknown> = {};
  const ret = () => chain;
  chain.from = ret;
  chain.where = ret;
  chain.orderBy = ret;
  chain.limit = ret;
  chain.offset = ret;
  chain.then = (resolve: (v: unknown) => void) => resolve(value);
  return chain;
}

function ownerOk() {
  return {
    ok: true as const,
    bot: { id: BOT_ID },
    userId: "u-1",
  };
}

describe("GET /api/bots/[botId]/conversations", () => {
  beforeEach(() => {
    requireBotOwnerMock.mockReset();
    selectMock.mockReset();
  });

  it("returns 401 when requireBotOwner fails", async () => {
    requireBotOwnerMock.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET(
      new Request("http://localhost/?page=1&limit=20"),
      PARAMS,
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid pagination", async () => {
    requireBotOwnerMock.mockResolvedValueOnce(ownerOk());
    const res = await GET(new Request("http://localhost/?page=0"), PARAMS);
    expect(res.status).toBe(400);
  });

  it("returns paginated items + total on the happy path", async () => {
    requireBotOwnerMock.mockResolvedValueOnce(ownerOk());
    selectMock
      .mockReturnValueOnce(
        chainResolving([
          {
            id: "conv-1",
            sessionId: "ses-1",
            recruiterEmail: null,
            messageCount: 4,
            startedAt: new Date("2026-06-01"),
            lastMessageAt: new Date("2026-06-01"),
            firstUserMessage: "what are her skills?",
          },
        ]),
      )
      .mockReturnValueOnce(chainResolving([{ total: 1 }]));

    const res = await GET(
      new Request("http://localhost/?page=1&limit=20"),
      PARAMS,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ id: string; firstUserMessage: string | null }>;
      total: number;
      page: number;
      limit: number;
    };
    expect(body.items).toHaveLength(1);
    expect(body.items[0]?.firstUserMessage).toBe("what are her skills?");
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
  });

  it("applies the ?q= search filter (extra select call shape, but route still returns items)", async () => {
    requireBotOwnerMock.mockResolvedValueOnce(ownerOk());
    selectMock
      .mockReturnValueOnce(chainResolving([]))
      .mockReturnValueOnce(chainResolving([{ total: 0 }]));

    const res = await GET(
      new Request("http://localhost/?q=python"),
      PARAMS,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[]; total: number };
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("returns empty items + total=0 when no conversations match", async () => {
    requireBotOwnerMock.mockResolvedValueOnce(ownerOk());
    selectMock
      .mockReturnValueOnce(chainResolving([]))
      .mockReturnValueOnce(chainResolving([{ total: 0 }]));

    const res = await GET(new Request("http://localhost/"), PARAMS);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[]; total: number };
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
  });
});
