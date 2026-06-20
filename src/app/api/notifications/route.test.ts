import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionMock = vi.fn();
const selectMock = vi.fn();

vi.mock("@/lib/auth/require-session", () => ({
  requireSession: (...args: unknown[]) => requireSessionMock(...args),
}));

vi.mock("@/lib/db", () => ({
  db: { select: (...args: unknown[]) => selectMock(...args) },
  notifications: {
    id: "n.id",
    userId: "n.user_id",
    kind: "n.kind",
    payload: "n.payload",
    readAt: "n.read_at",
    createdAt: "n.created_at",
    botId: "n.bot_id",
  },
}));

import { GET } from "./route";

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

function sessionOk() {
  return { ok: true as const, userId: "u-1", username: "jane" };
}

describe("GET /api/notifications", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
    selectMock.mockReset();
  });

  it("returns 401 when no session", async () => {
    requireSessionMock.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET(new Request("http://localhost/"));
    expect(res.status).toBe(401);
  });

  it("returns paginated items + unreadCount on the happy path", async () => {
    requireSessionMock.mockResolvedValueOnce(sessionOk());
    selectMock
      .mockReturnValueOnce(
        chainResolving([
          {
            id: "n-1",
            kind: "lead_captured",
            payload: { email: "x@y.com", botName: "Jane" },
            readAt: null,
            createdAt: new Date("2026-06-19"),
            botId: "bot-1",
          },
        ]),
      )
      .mockReturnValueOnce(chainResolving([{ total: 1 }]))
      .mockReturnValueOnce(chainResolving([{ unread: 1 }]));

    const res = await GET(new Request("http://localhost/?page=1&limit=20"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: unknown[];
      total: number;
      unreadCount: number;
    };
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.unreadCount).toBe(1);
  });

  it("applies the unread filter when ?unread=true", async () => {
    requireSessionMock.mockResolvedValueOnce(sessionOk());
    selectMock
      .mockReturnValueOnce(chainResolving([]))
      .mockReturnValueOnce(chainResolving([{ total: 0 }]))
      .mockReturnValueOnce(chainResolving([{ unread: 0 }]));

    const res = await GET(new Request("http://localhost/?unread=true"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { unreadCount: number };
    expect(body.unreadCount).toBe(0);
  });

  it("returns 400 on invalid pagination", async () => {
    requireSessionMock.mockResolvedValueOnce(sessionOk());
    const res = await GET(new Request("http://localhost/?page=0"));
    expect(res.status).toBe(400);
  });
});
