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
        contextText: "INJECTED",
        createdAt: "1970-01-01",
      }),
      PARAMS,
    );
    expect(res.status).toBe(200);
    // Only themeColor was passed to the UPDATE SET. `isActive` is now a
    // legitimately whitelisted field (Slice B status toggle) so it's
    // omitted from this regression - see the dedicated isActive spec.
    const setArg = updateSetMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg).toEqual({ themeColor: "#ff00aa" });
    expect(setArg).not.toHaveProperty("userId");
    expect(setArg).not.toHaveProperty("contextText");
    expect(setArg).not.toHaveProperty("createdAt");
  });

  // Stage 6 §6.5: settings page PATCHes identity fields.
  it("accepts a name+headline PATCH and forwards both to UPDATE SET", async () => {
    const res = await PATCH(
      makeRequest({ name: "Jane Doe", headline: "ML Engineer" }),
      PARAMS,
    );
    expect(res.status).toBe(200);
    const setArg = updateSetMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg).toEqual({ name: "Jane Doe", headline: "ML Engineer" });
  });

  it("accepts personality + suggestedQuestions in one PATCH", async () => {
    const res = await PATCH(
      makeRequest({
        personality: "creative",
        suggestedQuestions: ["Tell me about her ML work", "Is she remote?"],
      }),
      PARAMS,
    );
    expect(res.status).toBe(200);
    const setArg = updateSetMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg.personality).toBe("creative");
    expect(setArg.suggestedQuestions).toEqual([
      "Tell me about her ML work",
      "Is she remote?",
    ]);
  });

  it("rejects an empty name string (Zod min(1))", async () => {
    const res = await PATCH(makeRequest({ name: "   " }), PARAMS);
    expect(res.status).toBe(400);
  });

  it("rejects a name > 100 chars", async () => {
    const res = await PATCH(makeRequest({ name: "x".repeat(101) }), PARAMS);
    expect(res.status).toBe(400);
  });

  it("rejects an invalid personality value", async () => {
    const res = await PATCH(makeRequest({ personality: "snarky" }), PARAMS);
    expect(res.status).toBe(400);
  });

  it("rejects > 6 suggested questions", async () => {
    const res = await PATCH(
      makeRequest({
        suggestedQuestions: ["q1", "q2", "q3", "q4", "q5", "q6", "q7"],
      }),
      PARAMS,
    );
    expect(res.status).toBe(400);
  });

  it("accepts isActive toggle (Slice B status switch)", async () => {
    const res = await PATCH(makeRequest({ isActive: false }), PARAMS);
    expect(res.status).toBe(200);
    const setArg = updateSetMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg).toEqual({ isActive: false });
  });

  it("rejects a non-boolean isActive", async () => {
    const res = await PATCH(makeRequest({ isActive: "yes" }), PARAMS);
    expect(res.status).toBe(400);
  });

  it("mass-assignment regression: settings PATCH cannot smuggle userId / contextText", async () => {
    const res = await PATCH(
      makeRequest({
        name: "Jane",
        userId: "attacker",
        contextText: "INJECTED",
        emailVerified: new Date(),
      }),
      PARAMS,
    );
    expect(res.status).toBe(200);
    const setArg = updateSetMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg).toEqual({ name: "Jane" });
    expect(setArg).not.toHaveProperty("userId");
    expect(setArg).not.toHaveProperty("contextText");
    expect(setArg).not.toHaveProperty("emailVerified");
  });
});
