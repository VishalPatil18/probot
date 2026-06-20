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
    id: "n.id",
    userId: "n.user_id",
    readAt: "n.read_at",
  },
}));

import { POST } from "./route";

const VALID_ID = "11111111-1111-1111-1111-111111111111";

function chainResolving(value: unknown) {
  const chain: Record<string, unknown> = {};
  const ret = () => chain;
  chain.set = ret;
  chain.where = ret;
  chain.returning = () => Promise.resolve(value);
  return chain;
}

describe("POST /api/notifications/[id]/read", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
    updateMock.mockReset();
  });

  it("returns 401 when no session", async () => {
    requireSessionMock.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(new Request("http://localhost/"), {
      params: { id: VALID_ID },
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when the id is not a UUID", async () => {
    requireSessionMock.mockResolvedValueOnce({
      ok: true,
      userId: "u-1",
      username: "jane",
    });
    const res = await POST(new Request("http://localhost/"), {
      params: { id: "not-a-uuid" },
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when the row update affects 0 rows (not found or not owner)", async () => {
    requireSessionMock.mockResolvedValueOnce({
      ok: true,
      userId: "u-1",
      username: "jane",
    });
    updateMock.mockReturnValueOnce(chainResolving([]));
    const res = await POST(new Request("http://localhost/"), {
      params: { id: VALID_ID },
    });
    expect(res.status).toBe(404);
  });

  it("returns the notification id + readAt on success", async () => {
    requireSessionMock.mockResolvedValueOnce({
      ok: true,
      userId: "u-1",
      username: "jane",
    });
    updateMock.mockReturnValueOnce(chainResolving([{ id: VALID_ID }]));
    const res = await POST(new Request("http://localhost/"), {
      params: { id: VALID_ID },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; readAt: string };
    expect(body.id).toBe(VALID_ID);
    expect(typeof body.readAt).toBe("string");
  });
});
