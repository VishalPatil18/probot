import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getServerSessionMock = vi.fn();

vi.mock("next-auth", () => ({
  default: () => () => null,
  getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}));

vi.mock("@/lib/auth/auth", () => ({
  authOptions: { providers: [] },
}));

const txUpdateUsersSetMock = vi.fn();
const txUpdateUsersWhereMock = vi.fn();
const txQueryBotsFindFirstMock = vi.fn();
const txInsertValuesMock = vi.fn();
const txInsertReturningMock = vi.fn();
const txUpdateBotsSetMock = vi.fn();
const txUpdateBotsWhereMock = vi.fn();
const txUpdateBotsReturningMock = vi.fn();

function buildTx() {
  return {
    update: vi.fn((table: unknown) => ({
      set: (vals: unknown) => {
        if (table === "users-table") {
          txUpdateUsersSetMock(vals);
          return { where: txUpdateUsersWhereMock };
        }
        txUpdateBotsSetMock(vals);
        return {
          where: (...args: unknown[]) => {
            txUpdateBotsWhereMock(...args);
            return { returning: txUpdateBotsReturningMock };
          },
        };
      },
    })),
    insert: vi.fn(() => ({
      values: (vals: unknown) => {
        txInsertValuesMock(vals);
        return { returning: txInsertReturningMock };
      },
    })),
    query: {
      bots: { findFirst: txQueryBotsFindFirstMock },
    },
  };
}

vi.mock("@/lib/db", () => ({
  db: {
    transaction: vi.fn(
      async <T,>(cb: (tx: ReturnType<typeof buildTx>) => Promise<T>) => {
        return cb(buildTx());
      },
    ),
  },
  users: "users-table" as unknown as Record<string, unknown>,
  bots: { userId: "user_id-col", id: "id-col" } as unknown as Record<
    string,
    unknown
  >,
}));

import { POST } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/bots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: "Jane Doe",
  headline: "ML Engineer",
  personality: "professional" as const,
  contextText: "I am an ML engineer with 5 years experience.",
  suggestedQuestions: ["What are her top skills?"],
  llmProvider: "anthropic" as const,
  llmModel: "claude-haiku-4-5",
};

describe("POST /api/bots", () => {
  const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;

  beforeEach(() => {
    // mintPreviewToken (called in the route after a successful INSERT) needs
    // a signing secret. Set a stable value for the test suite.
    process.env.NEXTAUTH_SECRET = "test-secret-for-bots-route-suite";
    getServerSessionMock.mockReset();
    txUpdateUsersSetMock.mockReset();
    txUpdateUsersWhereMock.mockReset().mockResolvedValue(undefined);
    txQueryBotsFindFirstMock.mockReset();
    txInsertValuesMock.mockReset();
    txInsertReturningMock.mockReset();
    txUpdateBotsSetMock.mockReset();
    txUpdateBotsWhereMock.mockReset();
    // Stage 7: the create path also UPDATEs the just-inserted row with the
    // minted previewToken. Default the mock so the destructure doesn't blow
    // up; individual tests can override.
    txUpdateBotsReturningMock
      .mockReset()
      .mockResolvedValue([
        { id: "bot-1", userId: "u1", name: "Jane Doe" },
      ]);
  });

  afterEach(() => {
    process.env.NEXTAUTH_SECRET = originalNextAuthSecret;
  });

  it("returns 401 when no session is present", async () => {
    getServerSessionMock.mockResolvedValueOnce(null);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
    expect(txInsertValuesMock).not.toHaveBeenCalled();
  });

  it("returns 400 on a malformed JSON body", async () => {
    getServerSessionMock.mockResolvedValueOnce({
      user: { id: "u1", username: "jane" },
    });
    const req = new Request("http://localhost/api/bots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(txInsertValuesMock).not.toHaveBeenCalled();
  });

  it("returns 400 on Zod validation failure", async () => {
    getServerSessionMock.mockResolvedValueOnce({
      user: { id: "u1", username: "jane" },
    });
    const res = await POST(
      makeRequest({ ...validBody, name: "", contextText: "" }),
    );
    expect(res.status).toBe(400);
    expect(txInsertValuesMock).not.toHaveBeenCalled();
  });

  it("inserts a new bot and updates user LLM prefs (201) when none exists", async () => {
    getServerSessionMock.mockResolvedValueOnce({
      user: { id: "u1", username: "jane" },
    });
    txQueryBotsFindFirstMock.mockResolvedValueOnce(undefined);
    txInsertReturningMock.mockResolvedValueOnce([
      { id: "bot-1", userId: "u1", name: "Jane Doe" },
    ]);

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(201);
    const body = (await res.json()) as { bot: { id: string; name: string } };
    expect(body.bot.id).toBe("bot-1");
    expect(body.bot.name).toBe("Jane Doe");

    expect(txUpdateUsersSetMock).toHaveBeenCalledWith({
      llmProvider: "anthropic",
      llmModel: "claude-haiku-4-5",
    });

    expect(txInsertValuesMock).toHaveBeenCalledTimes(1);
    const inserted = txInsertValuesMock.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(inserted.userId).toBe("u1");
    expect(inserted.name).toBe("Jane Doe");
    expect(inserted.personality).toBe("professional");
    expect(inserted.contextText).toBe(
      "I am an ML engineer with 5 years experience.",
    );
    // Stage 7 §FR-002.10: new bots are created as drafts.
    expect(inserted.isActive).toBe(false);
    // Stage 7: the route follows the INSERT with an UPDATE that sets the
    // previewToken on the newly-created bot row.
    expect(txUpdateBotsSetMock).toHaveBeenCalledTimes(1);
    const updatedSet = txUpdateBotsSetMock.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(typeof updatedSet.previewToken).toBe("string");
    expect((updatedSet.previewToken as string).length).toBeGreaterThan(20);
  });

  it("updates the existing bot (200) when the user already owns one", async () => {
    getServerSessionMock.mockResolvedValueOnce({
      user: { id: "u1", username: "jane" },
    });
    txQueryBotsFindFirstMock.mockResolvedValueOnce({
      id: "existing-bot",
      userId: "u1",
    });
    txUpdateBotsReturningMock.mockResolvedValueOnce([
      { id: "existing-bot", userId: "u1", name: "Jane Doe" },
    ]);

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(200);
    const body = (await res.json()) as { bot: { id: string } };
    expect(body.bot.id).toBe("existing-bot");

    expect(txUpdateBotsSetMock).toHaveBeenCalledTimes(1);
    expect(txInsertValuesMock).not.toHaveBeenCalled();
  });

  it("never writes an llm API key to the bots row (BYO key invariant)", async () => {
    getServerSessionMock.mockResolvedValueOnce({
      user: { id: "u1", username: "jane" },
    });
    txQueryBotsFindFirstMock.mockResolvedValueOnce(undefined);
    txInsertReturningMock.mockResolvedValueOnce([
      { id: "bot-1", userId: "u1", name: "Jane Doe" },
    ]);

    const res = await POST(
      makeRequest({
        ...validBody,
        apiKey: "sk-ant-leak-canary-9876543210",
      } as unknown as typeof validBody),
    );
    expect(res.status).toBe(201);

    const inserted = txInsertValuesMock.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(JSON.stringify(inserted)).not.toContain("sk-ant-leak-canary");
    expect(inserted).not.toHaveProperty("apiKey");
  });
});
