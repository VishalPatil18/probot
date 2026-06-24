import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const findUserMock = vi.fn();
const updateMock = vi.fn();
const updateSetMock = vi.fn();
const updateWhereMock = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => getSessionMock(...args),
}));

vi.mock("@/lib/auth/auth", () => ({
  authOptions: {} as Record<string, unknown>,
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: { findFirst: (...args: unknown[]) => findUserMock(...args) },
    },
    update: (...args: unknown[]) => updateMock(...args),
  },
  users: { id: "id-col" } as Record<string, unknown>,
}));

import { GET, PATCH } from "./route";

const USER_ID = "11111111-1111-1111-1111-111111111111";

function patchRequest(body: unknown): Request {
  return new Request("http://localhost/api/users/me/notification-prefs", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("/api/users/me/notification-prefs", () => {
  beforeEach(() => {
    getSessionMock.mockReset().mockResolvedValue({ user: { id: USER_ID } });
    findUserMock.mockReset().mockResolvedValue({ notifyLeadsEmail: true });
    updateMock.mockReset().mockReturnValue({ set: updateSetMock });
    updateSetMock.mockReset().mockReturnValue({ where: updateWhereMock });
    updateWhereMock.mockReset().mockResolvedValue(undefined);
  });

  it("GET returns the current preference", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ notifyLeadsEmail: true });
  });

  it("GET 401s without a session", async () => {
    getSessionMock.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("PATCH updates the preference", async () => {
    const res = await PATCH(patchRequest({ notifyLeadsEmail: false }));
    expect(res.status).toBe(200);
    expect(updateSetMock).toHaveBeenCalledWith({ notifyLeadsEmail: false });
  });

  it("PATCH 400s on a non-boolean value", async () => {
    const res = await PATCH(patchRequest({ notifyLeadsEmail: "yes" }));
    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
