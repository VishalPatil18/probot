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

import { ANIMAL_AVATARS } from "@/lib/avatars";
import { PATCH } from "./route";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const VALID_AVATAR = ANIMAL_AVATARS[0];
const EXTERNAL_AVATAR = "https://example.com/google-photo.jpg";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/onboarding/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("PATCH /api/onboarding/profile", () => {
  beforeEach(() => {
    getSessionMock
      .mockReset()
      .mockResolvedValue({ user: { id: USER_ID, username: "user-abcdef12" } });
    findUserMock
      .mockReset()
      .mockResolvedValue({ image: VALID_AVATAR, username: "user-abcdef12" });
    updateMock.mockReset();
    updateSetMock.mockReset();
    updateWhereMock.mockReset().mockResolvedValue(undefined);
    updateMock.mockReturnValue({ set: updateSetMock });
    updateSetMock.mockReturnValue({ where: updateWhereMock });
  });

  it("returns 401 when no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);
    const res = await PATCH(
      makeRequest({ username: "jane-doe", image: VALID_AVATAR }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON body", async () => {
    const res = await PATCH(makeRequest("not-json{"));
    expect(res.status).toBe(400);
  });

  it("returns 400 on username that fails the regex", async () => {
    const res = await PATCH(
      makeRequest({ username: "Bad Username!", image: VALID_AVATAR }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("validation_failed");
  });

  it("returns 400 on reserved username (e.g. 'admin')", async () => {
    const res = await PATCH(
      makeRequest({ username: "admin", image: VALID_AVATAR }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when avatar URL is not allowlisted AND does not equal current image", async () => {
    findUserMock.mockResolvedValueOnce({
      image: VALID_AVATAR,
      username: "user-abcdef12",
    });
    const res = await PATCH(
      makeRequest({
        username: "jane-doe",
        image: "https://evil.com/spoof.png",
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("invalid_avatar");
  });

  it("accepts an external image when it equals the user's current users.image (OAuth photo passthrough)", async () => {
    findUserMock.mockResolvedValueOnce({
      image: EXTERNAL_AVATAR,
      username: "user-abcdef12",
    });
    const res = await PATCH(
      makeRequest({ username: "jane-doe", image: EXTERNAL_AVATAR }),
    );
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateSetMock).toHaveBeenCalledWith({
      username: "jane-doe",
      image: EXTERNAL_AVATAR,
    });
  });

  it("returns 200 + updates username + image on the happy path", async () => {
    const res = await PATCH(
      makeRequest({ username: "jane-doe", image: VALID_AVATAR }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: Record<string, unknown> };
    expect(body.user).toEqual({
      id: USER_ID,
      username: "jane-doe",
      image: VALID_AVATAR,
    });
    expect(updateSetMock).toHaveBeenCalledWith({
      username: "jane-doe",
      image: VALID_AVATAR,
    });
  });

  it("returns 409 when the username is already taken (pg unique_violation 23505)", async () => {
    const err = Object.assign(new Error("dup"), { code: "23505" });
    updateWhereMock.mockRejectedValueOnce(err);
    const res = await PATCH(
      makeRequest({ username: "jane-doe", image: VALID_AVATAR }),
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("username_taken");
  });

  it("returns 404 when the user row no longer exists", async () => {
    findUserMock.mockResolvedValueOnce(undefined);
    const res = await PATCH(
      makeRequest({ username: "jane-doe", image: VALID_AVATAR }),
    );
    expect(res.status).toBe(404);
  });

  it("rejects an image URL longer than 2000 chars", async () => {
    const long = `https://example.com/${"x".repeat(2100)}`;
    const res = await PATCH(
      makeRequest({ username: "jane-doe", image: long }),
    );
    expect(res.status).toBe(400);
  });
});
