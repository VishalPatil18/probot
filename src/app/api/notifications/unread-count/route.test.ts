import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionMock = vi.fn();
const selectMock = vi.fn();

vi.mock("@/lib/auth/require-session", () => ({
  requireSession: (...args: unknown[]) => requireSessionMock(...args),
}));

vi.mock("@/lib/db", () => ({
  db: { select: (...args: unknown[]) => selectMock(...args) },
  notifications: { userId: "n.user_id", readAt: "n.read_at" },
}));

import { GET } from "./route";

function chainResolving(value: unknown) {
  const chain: Record<string, unknown> = {};
  const ret = () => chain;
  chain.from = ret;
  chain.where = ret;
  chain.then = (resolve: (v: unknown) => void) => resolve(value);
  return chain;
}

describe("GET /api/notifications/unread-count", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
    selectMock.mockReset();
  });

  it("returns 401 when no session", async () => {
    requireSessionMock.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns { count } on the happy path", async () => {
    requireSessionMock.mockResolvedValueOnce({
      ok: true,
      userId: "u-1",
      username: "jane",
    });
    selectMock.mockReturnValueOnce(chainResolving([{ count: 7 }]));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { count: number };
    expect(body.count).toBe(7);
  });

  it("returns { count: 0 } when no unread rows", async () => {
    requireSessionMock.mockResolvedValueOnce({
      ok: true,
      userId: "u-1",
      username: "jane",
    });
    selectMock.mockReturnValueOnce(chainResolving([]));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { count: number };
    expect(body.count).toBe(0);
  });
});
