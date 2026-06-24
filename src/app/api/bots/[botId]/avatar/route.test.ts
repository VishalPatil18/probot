import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireBotOwnerMock = vi.fn();
const transactionMock = vi.fn();
const insertValuesMock = vi.fn();
const onConflictMock = vi.fn();
const updateSetMock = vi.fn();
const updateWhereMock = vi.fn();

vi.mock("@/lib/bots/require-bot-owner", () => ({
  requireBotOwner: (...args: unknown[]) => requireBotOwnerMock(...args),
}));

vi.mock("@/lib/db", () => ({
  db: {
    transaction: (...args: unknown[]) => transactionMock(...args),
  },
  botAvatars: { botId: "bot-id-col" } as Record<string, unknown>,
  bots: { id: "id-col" } as Record<string, unknown>,
}));

import { POST } from "./route";

const BOT_ID = "11111111-1111-1111-1111-111111111111";
const PARAMS = { params: { botId: BOT_ID } };

const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
]);

function makeRequest(file: File | null): Request {
  const form = new FormData();
  if (file) form.append("file", file);
  return new Request(`http://localhost/api/bots/${BOT_ID}/avatar`, {
    method: "POST",
    body: form,
  });
}

describe("POST /api/bots/[botId]/avatar", () => {
  beforeEach(() => {
    requireBotOwnerMock
      .mockReset()
      .mockResolvedValue({ ok: true, bot: { id: BOT_ID }, userId: "user-1" });
    onConflictMock.mockReset().mockResolvedValue(undefined);
    insertValuesMock
      .mockReset()
      .mockReturnValue({ onConflictDoUpdate: onConflictMock });
    updateWhereMock.mockReset().mockResolvedValue(undefined);
    updateSetMock.mockReset().mockReturnValue({ where: updateWhereMock });
    transactionMock
      .mockReset()
      .mockImplementation(async (cb: (tx: unknown) => unknown) =>
        cb({
          insert: () => ({ values: insertValuesMock }),
          update: () => ({ set: updateSetMock }),
        }),
      );
  });

  it("returns the owner-guard response when the caller is not the owner", async () => {
    requireBotOwnerMock.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    });
    const res = await POST(
      makeRequest(new File([PNG_BYTES], "a.png", { type: "image/png" })),
      PARAMS,
    );
    expect(res.status).toBe(403);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("returns 415 when bytes are not a supported image", async () => {
    const res = await POST(
      makeRequest(new File(["plain"], "a.png", { type: "image/png" })),
      PARAMS,
    );
    expect(res.status).toBe(415);
  });

  it("stores the bot avatar and returns the serve URL on success", async () => {
    const res = await POST(
      makeRequest(new File([PNG_BYTES], "a.png", { type: "image/png" })),
      PARAMS,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { image: string };
    expect(body.image).toContain(`/api/bot-avatar/${BOT_ID}`);
    expect(onConflictMock).toHaveBeenCalledTimes(1);
  });
});
