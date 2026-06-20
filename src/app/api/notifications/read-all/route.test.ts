import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionMock = vi.fn();
const updateMock = vi.fn();

vi.mock("@/lib/auth/require-session", () => ({
  requireSession: (...args: unknown[]) => requireSessionMock(...args),
}));

vi.mock("@/lib/db", () => ({
  db: { update: (...args: unknown[]) => updateMock(...args) },
  notifications: {
    userId: "n.user_id",
    readAt: "n.read_at",
    id: "n.id",
  },
}));

import { POST } from "./route";

function chainResolving(value: unknown) {
  const chain: Record<string, unknown> = {};
  const ret = () => chain;
  chain.set = ret;
  chain.where = ret;
  chain.returning = () => Promise.resolve(value);
  return chain;
}

describe("POST /api/notifications/read-all", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
    updateMock.mockReset();
  });

  it("returns 401 when no session", async () => {
    requireSessionMock.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns { markedRead } with the row count on success", async () => {
    requireSessionMock.mockResolvedValueOnce({
      ok: true,
      userId: "u-1",
      username: "jane",
    });
    updateMock.mockReturnValueOnce(
      chainResolving([{ id: "n-1" }, { id: "n-2" }, { id: "n-3" }]),
    );
    const res = await POST();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { markedRead: number };
    expect(body.markedRead).toBe(3);
  });

  it("returns { markedRead: 0 } when nothing was unread", async () => {
    requireSessionMock.mockResolvedValueOnce({
      ok: true,
      userId: "u-1",
      username: "jane",
    });
    updateMock.mockReturnValueOnce(chainResolving([]));
    const res = await POST();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { markedRead: number };
    expect(body.markedRead).toBe(0);
  });
});
