import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const transactionMock = vi.fn();
const insertValuesMock = vi.fn();
const onConflictMock = vi.fn();
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
    transaction: (...args: unknown[]) => transactionMock(...args),
  },
  userAvatars: { userId: "user-id-col" } as Record<string, unknown>,
  users: { id: "id-col" } as Record<string, unknown>,
}));

import { POST } from "./route";

const USER_ID = "11111111-1111-1111-1111-111111111111";

// Minimal valid magic-byte headers so the sniff passes for each format.
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);

function makeRequest(file: File | null): Request {
  const form = new FormData();
  if (file) form.append("file", file);
  return new Request("http://localhost/api/users/me/avatar", {
    method: "POST",
    body: form,
  });
}

describe("POST /api/users/me/avatar", () => {
  beforeEach(() => {
    getSessionMock.mockReset().mockResolvedValue({ user: { id: USER_ID } });
    onConflictMock.mockReset().mockResolvedValue(undefined);
    insertValuesMock.mockReset().mockReturnValue({ onConflictDoUpdate: onConflictMock });
    updateWhereMock.mockReset().mockResolvedValue(undefined);
    updateSetMock.mockReset().mockReturnValue({ where: updateWhereMock });
    transactionMock.mockReset().mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({
        insert: () => ({ values: insertValuesMock }),
        update: () => ({ set: updateSetMock }),
      }),
    );
  });

  it("returns 401 when there is no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);
    const res = await POST(
      makeRequest(new File([PNG_BYTES], "a.png", { type: "image/png" })),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when no file is provided", async () => {
    const res = await POST(makeRequest(null));
    expect(res.status).toBe(400);
  });

  it("returns 415 for an unsupported type", async () => {
    const res = await POST(
      makeRequest(new File(["plain text"], "a.txt", { type: "text/plain" })),
    );
    expect(res.status).toBe(415);
  });

  it("returns 415 when bytes don't match the declared image type", async () => {
    const res = await POST(
      makeRequest(new File(["not a png"], "a.png", { type: "image/png" })),
    );
    expect(res.status).toBe(415);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("stores the avatar and returns the serve URL on success", async () => {
    const res = await POST(
      makeRequest(new File([PNG_BYTES], "a.png", { type: "image/png" })),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { image: string };
    expect(body.image).toContain(`/api/avatar/${USER_ID}`);
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(onConflictMock).toHaveBeenCalledTimes(1);
  });

  it("accepts a JPEG even when the browser labels it image/jpg", async () => {
    const res = await POST(
      makeRequest(new File([JPEG_BYTES], "a.jpeg", { type: "image/jpg" })),
    );
    expect(res.status).toBe(200);
    expect(transactionMock).toHaveBeenCalledTimes(1);
  });
});
