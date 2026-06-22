import { beforeEach, describe, expect, it, vi } from "vitest";

const findAvatarMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      botAvatars: { findFirst: (...args: unknown[]) => findAvatarMock(...args) },
    },
  },
  botAvatars: { botId: "bot-id-col" } as Record<string, unknown>,
}));

import { GET } from "./route";

const BOT_ID = "11111111-1111-1111-1111-111111111111";

function makeRequest(): Request {
  return new Request(`http://localhost/api/bot-avatar/${BOT_ID}`);
}

describe("GET /api/bot-avatar/[botId]", () => {
  beforeEach(() => {
    findAvatarMock.mockReset();
  });

  it("returns 404 when the bot has no stored avatar", async () => {
    findAvatarMock.mockResolvedValueOnce(undefined);
    const res = await GET(makeRequest(), { params: { botId: BOT_ID } });
    expect(res.status).toBe(404);
  });

  it("serves the bytes with the stored content type", async () => {
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    findAvatarMock.mockResolvedValueOnce({
      data: bytes,
      contentType: "image/png",
    });
    const res = await GET(makeRequest(), { params: { botId: BOT_ID } });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    const body = Buffer.from(await res.arrayBuffer());
    expect(body.equals(bytes)).toBe(true);
  });
});
