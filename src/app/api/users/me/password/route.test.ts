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

import { hashPassword } from "@/lib/auth/passwords";
import { POST } from "./route";

const USER_ID = "11111111-1111-1111-1111-111111111111";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/users/me/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/users/me/password", () => {
  let currentHash: string;

  beforeEach(async () => {
    currentHash = await hashPassword("current-password");
    getSessionMock.mockReset().mockResolvedValue({ user: { id: USER_ID } });
    findUserMock.mockReset().mockResolvedValue({ hashedPassword: currentHash });
    updateMock.mockReset().mockReturnValue({ set: updateSetMock });
    updateSetMock.mockReset().mockReturnValue({ where: updateWhereMock });
    updateWhereMock.mockReset().mockResolvedValue(undefined);
  });

  it("returns 401 when there is no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);
    const res = await POST(
      makeRequest({ currentPassword: "x", newPassword: "newpassword1" }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when the new password is too short", async () => {
    const res = await POST(
      makeRequest({ currentPassword: "current-password", newPassword: "short" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 no_password_set for accounts without a password", async () => {
    findUserMock.mockResolvedValueOnce({ hashedPassword: null });
    const res = await POST(
      makeRequest({
        currentPassword: "anything",
        newPassword: "newpassword1",
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("no_password_set");
  });

  it("returns 400 invalid_current_password on a wrong current password", async () => {
    const res = await POST(
      makeRequest({ currentPassword: "wrong", newPassword: "newpassword1" }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("invalid_current_password");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("updates the password on the happy path", async () => {
    const res = await POST(
      makeRequest({
        currentPassword: "current-password",
        newPassword: "newpassword1",
      }),
    );
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledTimes(1);
  });
});
