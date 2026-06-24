import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireBotTokenMock = vi.fn();

vi.mock("@/lib/bot-tokens/service", () => ({
  requireBotToken: (...args: unknown[]) => requireBotTokenMock(...args),
}));

import { GET } from "./route";

function configRequest(): Request {
  return new Request("http://localhost/api/v1/bot/config");
}

beforeEach(() => {
  requireBotTokenMock.mockReset();
});

describe("GET /api/v1/bot/config", () => {
  it("returns the auth guard's 401 when the token is invalid", async () => {
    requireBotTokenMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "invalid_bot_token" }, { status: 401 }),
    });
    const res = await GET(configRequest());
    expect(res.status).toBe(401);
  });

  it("returns public config (with array defaults) for a valid token", async () => {
    requireBotTokenMock.mockResolvedValue({
      ok: true,
      tokenId: "tok-1",
      bot: {
        id: "bot-1",
        name: "Demo",
        headline: "Ask me anything",
        personality: "professional",
        themeColor: null,
        image: null,
        suggestedQuestions: ["What's your stack?"],
        loadingMessages: null,
        isActive: true,
        deploymentMode: "self_hosted",
      },
    });
    const res = await GET(configRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("bot-1");
    expect(body.suggestedQuestions).toEqual(["What's your stack?"]);
    expect(body.loadingMessages).toEqual([]); // null coalesced to []
    expect(body.deploymentMode).toBe("self_hosted");
  });
});
