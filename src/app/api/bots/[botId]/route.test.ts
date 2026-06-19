import { beforeEach, describe, expect, it, vi } from "vitest";

const requireBotOwnerMock = vi.fn();
const updateMock = vi.fn();
const updateSetMock = vi.fn();
const updateWhereMock = vi.fn();
const updateReturningMock = vi.fn();

vi.mock("@/lib/bots/require-bot-owner", () => ({
  requireBotOwner: (...args: unknown[]) => requireBotOwnerMock(...args),
}));

vi.mock("@/lib/db", () => ({
  db: {
    update: (...args: unknown[]) => updateMock(...args),
  },
  bots: { id: "id-col", themeColor: "theme_color-col" } as Record<
    string,
    unknown
  >,
}));

import { PATCH } from "./route";

const BOT_ID = "11111111-1111-1111-1111-111111111111";
const PARAMS = { params: { botId: BOT_ID } };

const owner = {
  ok: true as const,
  bot: { id: BOT_ID, themeColor: "#7c5cff" },
  userId: "user-1",
};

function makeRequest(body: unknown): Request {
  return new Request(`http://localhost/api/bots/${BOT_ID}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("PATCH /api/bots/[botId]", () => {
  beforeEach(() => {
    requireBotOwnerMock.mockReset().mockResolvedValue(owner);
    updateMock.mockReset();
    updateSetMock.mockReset();
    updateWhereMock.mockReset();
    updateReturningMock
      .mockReset()
      .mockResolvedValue([{ id: BOT_ID, themeColor: "#ff00aa" }]);
    updateMock.mockReturnValue({ set: updateSetMock });
    updateSetMock.mockReturnValue({ where: updateWhereMock });
    updateWhereMock.mockReturnValue({ returning: updateReturningMock });
  });

  it("returns 401 when requireBotOwner denies", async () => {
    requireBotOwnerMock.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
      }),
    });
    const res = await PATCH(makeRequest({ themeColor: "#ff00aa" }), PARAMS);
    expect(res.status).toBe(401);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid JSON body", async () => {
    const res = await PATCH(makeRequest("not-json{"), PARAMS);
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("invalid_json");
  });

  it("returns 400 on invalid hex color", async () => {
    const res = await PATCH(makeRequest({ themeColor: "#nope" }), PARAMS);
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("validation_failed");
  });

  it("returns 400 when no fields are provided (empty PATCH)", async () => {
    const res = await PATCH(makeRequest({}), PARAMS);
    expect(res.status).toBe(400);
  });

  it("returns 200 with updated themeColor on happy path", async () => {
    const res = await PATCH(makeRequest({ themeColor: "#ff00aa" }), PARAMS);
    expect(res.status).toBe(200);
    expect(updateSetMock).toHaveBeenCalledWith({ themeColor: "#ff00aa" });
    const body = (await res.json()) as { bot: { themeColor: string } };
    expect(body.bot.themeColor).toBe("#ff00aa");
  });

  it("ignores extra fields (mass-assignment safe)", async () => {
    const res = await PATCH(
      makeRequest({
        themeColor: "#ff00aa",
        userId: "attacker-userid",
        isActive: false,
        contextText: "INJECTED",
      }),
      PARAMS,
    );
    expect(res.status).toBe(200);
    // Only themeColor was passed to the UPDATE SET
    const setArg = updateSetMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg).toEqual({ themeColor: "#ff00aa" });
    expect(setArg).not.toHaveProperty("userId");
    expect(setArg).not.toHaveProperty("isActive");
    expect(setArg).not.toHaveProperty("contextText");
  });
});
