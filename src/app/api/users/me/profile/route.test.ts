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
  users: { id: "id-col", username: "username-col" } as Record<string, unknown>,
}));

import { PATCH } from "./route";

const USER_ID = "11111111-1111-1111-1111-111111111111";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/users/me/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("PATCH /api/users/me/profile", () => {
  beforeEach(() => {
    getSessionMock.mockReset().mockResolvedValue({ user: { id: USER_ID } });
    findUserMock.mockReset().mockResolvedValue(undefined);
    updateMock.mockReset().mockReturnValue({ set: updateSetMock });
    updateSetMock.mockReset().mockReturnValue({ where: updateWhereMock });
    updateWhereMock.mockReset().mockResolvedValue(undefined);
  });

  it("returns 401 when there is no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);
    const res = await PATCH(makeRequest({ name: "Jane", username: "jane-doe" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on an invalid username", async () => {
    const res = await PATCH(
      makeRequest({ name: "Jane", username: "Bad Name!" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 when another user already has the username", async () => {
    findUserMock.mockResolvedValueOnce({ id: "other-user" });
    const res = await PATCH(makeRequest({ name: "Jane", username: "taken" }));
    expect(res.status).toBe(409);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("updates name + username on the happy path", async () => {
    const res = await PATCH(makeRequest({ name: "Jane", username: "jane-doe" }));
    expect(res.status).toBe(200);
    expect(updateSetMock).toHaveBeenCalledWith({
      name: "Jane",
      username: "jane-doe",
    });
  });

  it("stores an empty name as NULL", async () => {
    await PATCH(makeRequest({ name: "", username: "jane-doe" }));
    expect(updateSetMock).toHaveBeenCalledWith({
      name: null,
      username: "jane-doe",
    });
  });

  it("maps a 23505 unique violation to 409", async () => {
    updateWhereMock.mockRejectedValueOnce(
      Object.assign(new Error("dup"), { code: "23505" }),
    );
    const res = await PATCH(makeRequest({ name: "Jane", username: "jane-doe" }));
    expect(res.status).toBe(409);
  });
});
