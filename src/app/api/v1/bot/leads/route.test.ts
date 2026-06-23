import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireBotTokenMock = vi.fn();
const captureLeadMock = vi.fn();

vi.mock("@/lib/bot-tokens/service", () => ({
  requireBotToken: (...args: unknown[]) => requireBotTokenMock(...args),
}));
vi.mock("@/lib/leads/capture", () => ({
  captureLead: (...args: unknown[]) => captureLeadMock(...args),
}));

import { POST } from "./route";

function leadRequest(body: unknown): Request {
  return new Request("http://localhost/api/v1/bot/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  requireBotTokenMock.mockReset();
  captureLeadMock.mockReset();
  requireBotTokenMock.mockResolvedValue({
    ok: true,
    tokenId: "tok-1",
    bot: { id: "bot-1", userId: "user-1", name: "Demo" },
  });
});

describe("POST /api/v1/bot/leads", () => {
  it("rejects an invalid token via the guard", async () => {
    requireBotTokenMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "invalid_bot_token" }, { status: 401 }),
    });
    const res = await POST(leadRequest({ email: "r@e.com" }));
    expect(res.status).toBe(401);
    expect(captureLeadMock).not.toHaveBeenCalled();
  });

  it("400s on an invalid email", async () => {
    const res = await POST(leadRequest({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(captureLeadMock).not.toHaveBeenCalled();
  });

  it("201s on a fresh capture", async () => {
    captureLeadMock.mockResolvedValue({
      lead: { id: "lead-1", email: "r@e.com" },
      deduped: false,
    });
    const res = await POST(
      leadRequest({ email: "r@e.com", contextSummary: "hi" }),
    );
    expect(res.status).toBe(201);
    expect(captureLeadMock).toHaveBeenCalledWith(
      expect.objectContaining({ botId: "bot-1", ownerUserId: "user-1" }),
    );
  });

  it("200s when the lead was deduped", async () => {
    captureLeadMock.mockResolvedValue({
      lead: { id: "lead-1", email: "r@e.com" },
      deduped: true,
    });
    const res = await POST(leadRequest({ email: "r@e.com" }));
    expect(res.status).toBe(200);
  });
});
