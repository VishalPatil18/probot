import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
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
  db: { update: (...args: unknown[]) => updateMock(...args) },
  users: { id: "id-col" } as Record<string, unknown>,
}));

import { POST } from "./route";

const USER_ID = "11111111-1111-1111-1111-111111111111";

describe("POST /api/users/me/legal-ack", () => {
  beforeEach(() => {
    getSessionMock.mockReset().mockResolvedValue({ user: { id: USER_ID } });
    updateMock.mockReset().mockReturnValue({ set: updateSetMock });
    updateSetMock.mockReset().mockReturnValue({ where: updateWhereMock });
    updateWhereMock.mockReset().mockResolvedValue(undefined);
  });

  it("401s without a session", async () => {
    getSessionMock.mockResolvedValueOnce(null);
    const res = await POST();
    expect(res.status).toBe(401);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("records the acknowledgement date", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    const setArg = updateSetMock.mock.calls[0]?.[0] as {
      lastLegalAckDate: Date;
    };
    expect(setArg.lastLegalAckDate).toBeInstanceOf(Date);
  });
});
