import { beforeEach, describe, expect, it, vi } from "vitest";

const findBotMock = vi.fn();
const findUserMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      bots: { findFirst: (...args: unknown[]) => findBotMock(...args) },
      users: { findFirst: (...args: unknown[]) => findUserMock(...args) },
    },
  },
  bots: { id: "id-col", isActive: "is_active-col" } as Record<string, unknown>,
  users: { id: "id-col" } as Record<string, unknown>,
}));

import { GET, OPTIONS } from "./route";

const BOT_ID = "11111111-1111-1111-1111-111111111111";
const PARAMS = { params: { botId: BOT_ID } };

const bot = {
  id: BOT_ID,
  userId: "user-1",
  name: "Jane Doe",
  headline: "Senior ML Engineer",
  themeColor: "#7c5cff",
  image: null,
  suggestedQuestions: ["What does she do?", "Tell me about her ML work."],
  loadingMessages: ["Thinking…"],
};

const owner = {
  username: "jane-doe",
  name: "Jane Doe",
  image: "https://example.com/jane.jpg",
};

function makeRequest(): Request {
  return new Request(`http://localhost/api/bots/${BOT_ID}/config`, {
    method: "GET",
  });
}

describe("GET /api/bots/[botId]/config", () => {
  beforeEach(() => {
    findBotMock.mockReset().mockResolvedValue(bot);
    findUserMock.mockReset().mockResolvedValue(owner);
  });

  it("returns 200 with public bot config (no auth required)", async () => {
    const res = await GET(makeRequest(), PARAMS);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toEqual({
      bot: {
        id: BOT_ID,
        name: "Jane Doe",
        headline: "Senior ML Engineer",
        themeColor: "#7c5cff",
        image: null,
        suggestedQuestions: [
          "What does she do?",
          "Tell me about her ML work.",
        ],
        loadingMessages: ["Thinking…"],
      },
      owner: {
        username: "jane-doe",
        name: "Jane Doe",
        image: "https://example.com/jane.jpg",
      },
    });
  });

  it("returns 404 when the bot is not found", async () => {
    findBotMock.mockResolvedValueOnce(undefined);
    const res = await GET(makeRequest(), PARAMS);
    expect(res.status).toBe(404);
  });

  it("returns 404 when the owner row is missing (orphan defense)", async () => {
    findUserMock.mockResolvedValueOnce(undefined);
    const res = await GET(makeRequest(), PARAMS);
    expect(res.status).toBe(404);
  });

  it("never echoes sensitive fields (contextText, email, llmProvider)", async () => {
    findBotMock.mockResolvedValueOnce({
      ...bot,
      contextText: "PRIVATE_CONTEXT_LEAK_CANARY",
    });
    findUserMock.mockResolvedValueOnce({
      ...owner,
      email: "jane@example.com",
      llmProvider: "openai",
      hashedPassword: "$2a$10$secret",
    });
    const res = await GET(makeRequest(), PARAMS);
    const raw = await res.text();
    expect(raw).not.toContain("PRIVATE_CONTEXT_LEAK_CANARY");
    expect(raw).not.toContain("jane@example.com");
    expect(raw).not.toContain("$2a$10$secret");
    expect(raw).not.toContain("llmProvider");
  });

  it("normalizes null suggestedQuestions to []", async () => {
    findBotMock.mockResolvedValueOnce({
      ...bot,
      suggestedQuestions: null,
    });
    const res = await GET(makeRequest(), PARAMS);
    const body = (await res.json()) as { bot: { suggestedQuestions: string[] } };
    expect(body.bot.suggestedQuestions).toEqual([]);
  });

  it("sets CORS headers on the GET response so the widget can read it cross-origin", async () => {
    const res = await GET(makeRequest(), PARAMS);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=60");
  });
});

describe("OPTIONS /api/bots/[botId]/config (CORS preflight)", () => {
  it("returns 204 No Content with the CORS allowlist headers", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain(
      "Content-Type",
    );
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });
});
