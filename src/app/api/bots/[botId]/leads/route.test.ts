import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireBotOwnerMock = vi.fn();
const selectMock = vi.fn();
const findBotMock = vi.fn();
const findLeadMock = vi.fn();
const findUserMock = vi.fn();
const transactionMock = vi.fn();
const sendLeadEmailMock = vi.fn();

vi.mock("@/lib/auth/email", () => ({
  sendLeadCapturedEmail: (...args: unknown[]) => sendLeadEmailMock(...args),
}));

const txCalls: {
  leadInsertValues?: Record<string, unknown>;
  conversationUpdateSet?: Record<string, unknown>;
  notificationInsertValues?: Record<string, unknown>;
} = {};

vi.mock("@/lib/bots/require-bot-owner", () => ({
  requireBotOwner: (...args: unknown[]) => requireBotOwnerMock(...args),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      bots: { findFirst: (...args: unknown[]) => findBotMock(...args) },
      leads: { findFirst: (...args: unknown[]) => findLeadMock(...args) },
      users: { findFirst: (...args: unknown[]) => findUserMock(...args) },
    },
    select: (...args: unknown[]) => selectMock(...args),
    transaction: (cb: (tx: unknown) => Promise<unknown>) => transactionMock(cb),
  },
  bots: { id: "b.id", isActive: "b.is_active" },
  conversations: { id: "c.id", botId: "c.bot_id" },
  leads: {
    id: "l.id",
    botId: "l.bot_id",
    conversationId: "l.conv_id",
    email: "l.email",
    contextSummary: "l.context_summary",
    capturedAt: "l.captured_at",
  },
  notifications: { id: "n.id" },
  users: { id: "u.id" },
}));

import { GET, OPTIONS, POST } from "./route";

const BOT_ID = "11111111-1111-1111-1111-111111111111";
const CONV_ID = "22222222-2222-2222-2222-222222222222";
const PARAMS = { params: { botId: BOT_ID } };

function chainResolving(value: unknown) {
  const chain: Record<string, unknown> = {};
  const ret = () => chain;
  chain.from = ret;
  chain.where = ret;
  chain.orderBy = ret;
  chain.limit = ret;
  chain.offset = ret;
  chain.then = (resolve: (v: unknown) => void) => resolve(value);
  return chain;
}

function ownerOk() {
  return { ok: true as const, bot: { id: BOT_ID }, userId: "u-1" };
}

function makePost(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request(`http://localhost/api/bots/${BOT_ID}/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function resetTransactionMock() {
  txCalls.leadInsertValues = undefined;
  txCalls.conversationUpdateSet = undefined;
  txCalls.notificationInsertValues = undefined;
  transactionMock
    .mockReset()
    .mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      let insertCallCount = 0;
      const tx = {
        insert: () => {
          insertCallCount += 1;
          if (insertCallCount === 1) {
            return {
              values: (v: Record<string, unknown>) => {
                txCalls.leadInsertValues = v;
                return {
                  returning: () =>
                    Promise.resolve([
                      {
                        id: "lead-new",
                        email: v.email,
                        contextSummary: v.contextSummary,
                        conversationId: v.conversationId,
                        capturedAt: new Date("2026-06-19T00:00:00Z"),
                      },
                    ]),
                };
              },
            };
          }
          return {
            values: (v: Record<string, unknown>) => {
              txCalls.notificationInsertValues = v;
              return Promise.resolve();
            },
          };
        },
        update: () => ({
          set: (v: Record<string, unknown>) => {
            txCalls.conversationUpdateSet = v;
            return { where: () => Promise.resolve() };
          },
        }),
      };
      return cb(tx);
    });
}

describe("GET /api/bots/[botId]/leads", () => {
  beforeEach(() => {
    requireBotOwnerMock.mockReset();
    selectMock.mockReset();
  });

  it("returns 401 when requireBotOwner fails", async () => {
    requireBotOwnerMock.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET(new Request("http://localhost/"), PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns paginated leads on the happy path", async () => {
    requireBotOwnerMock.mockResolvedValueOnce(ownerOk());
    selectMock
      .mockReturnValueOnce(
        chainResolving([
          {
            id: "l-1",
            email: "rec@x.com",
            contextSummary: "asked about ML",
            conversationId: CONV_ID,
            capturedAt: new Date("2026-06-19"),
          },
        ]),
      )
      .mockReturnValueOnce(chainResolving([{ total: 1 }]));

    const res = await GET(
      new Request("http://localhost/?page=1&limit=20"),
      PARAMS,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<Record<string, unknown>>;
      total: number;
      page: number;
      limit: number;
    };
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
  });
});

describe("OPTIONS /api/bots/[botId]/leads", () => {
  it("returns 204 with the public CORS headers", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("POST /api/bots/[botId]/leads (CORS-public)", () => {
  beforeEach(() => {
    findBotMock.mockReset();
    findLeadMock.mockReset();
    selectMock.mockReset();
    findUserMock
      .mockReset()
      .mockResolvedValue({ email: "owner@x.com", notifyLeadsEmail: false });
    sendLeadEmailMock.mockReset();
    resetTransactionMock();
  });

  it("returns 415 on wrong content-type", async () => {
    const req = new Request(`http://localhost/api/bots/${BOT_ID}/leads`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "hi",
    });
    const res = await POST(req, PARAMS);
    expect(res.status).toBe(415);
  });

  it("returns 413 on oversized body", async () => {
    const big = "x".repeat(5000);
    const res = await POST(makePost({ email: "a@b.com", junk: big }), PARAMS);
    expect(res.status).toBe(413);
  });

  it("returns 400 on invalid JSON", async () => {
    const res = await POST(makePost("not json"), PARAMS);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_json");
  });

  it("returns 400 on validation failure (bad email)", async () => {
    const res = await POST(makePost({ email: "not-an-email" }), PARAMS);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("validation_failed");
  });

  it("returns 404 when the bot is missing or inactive", async () => {
    findBotMock.mockResolvedValueOnce(undefined);
    const res = await POST(
      makePost({ name: "Rec", email: "a@b.com", company: "Acme" }),
      PARAMS,
    );
    expect(res.status).toBe(404);
  });

  it("creates a lead + notification atomically and returns 201", async () => {
    findBotMock.mockResolvedValueOnce({
      id: BOT_ID,
      userId: "u-1",
      name: "Jane Doe",
    });
    findLeadMock.mockResolvedValueOnce(undefined);

    const res = await POST(
      makePost({
        name: "Rec Ruiter",
        email: "rec@example.com",
        company: "Acme Inc",
        conversationId: CONV_ID,
        contextSummary: "asked about ML",
      }),
      PARAMS,
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      lead: { id: string };
      deduped: boolean;
    };
    expect(body.deduped).toBe(false);
    expect(body.lead.id).toBe("lead-new");

    expect(txCalls.leadInsertValues).toMatchObject({
      botId: BOT_ID,
      conversationId: CONV_ID,
      email: "rec@example.com",
      contextSummary: "asked about ML",
    });
    expect(txCalls.conversationUpdateSet).toEqual({
      recruiterEmail: "rec@example.com",
    });
    expect(txCalls.notificationInsertValues).toMatchObject({
      userId: "u-1",
      botId: BOT_ID,
      kind: "lead_captured",
    });
    const payload = txCalls.notificationInsertValues?.payload as Record<
      string,
      unknown
    >;
    expect(payload.email).toBe("rec@example.com");
    expect(payload.botName).toBe("Jane Doe");
  });

  it("emails the owner when they opted in (best-effort, after the lead is saved)", async () => {
    findBotMock.mockResolvedValueOnce({
      id: BOT_ID,
      userId: "u-1",
      name: "Jane Doe",
    });
    findLeadMock.mockResolvedValueOnce(undefined);
    findUserMock.mockResolvedValueOnce({
      email: "owner@x.com",
      notifyLeadsEmail: true,
    });

    const res = await POST(makePost({ name: "Rec", email: "rec@example.com", company: "Acme" }), PARAMS);
    expect(res.status).toBe(201);
    expect(sendLeadEmailMock).toHaveBeenCalledTimes(1);
    expect(sendLeadEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "owner@x.com", leadEmail: "rec@example.com" }),
    );
  });

  it("does not email when the owner has not opted in", async () => {
    findBotMock.mockResolvedValueOnce({
      id: BOT_ID,
      userId: "u-1",
      name: "Jane Doe",
    });
    findLeadMock.mockResolvedValueOnce(undefined);

    const res = await POST(makePost({ name: "Rec", email: "rec@example.com", company: "Acme" }), PARAMS);
    expect(res.status).toBe(201);
    expect(sendLeadEmailMock).not.toHaveBeenCalled();
  });

  it("is idempotent on (conversationId, email): second submit returns existing lead with deduped=true", async () => {
    findBotMock.mockResolvedValueOnce({
      id: BOT_ID,
      userId: "u-1",
      name: "Jane Doe",
    });
    findLeadMock.mockResolvedValueOnce({
      id: "lead-existing",
      email: "rec@example.com",
      contextSummary: null,
      conversationId: CONV_ID,
      capturedAt: new Date("2026-06-18"),
    });

    const res = await POST(
      makePost({
        name: "Rec",
        email: "rec@example.com",
        company: "Acme",
        conversationId: CONV_ID,
      }),
      PARAMS,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      deduped: boolean;
      lead: { id: string };
    };
    expect(body.deduped).toBe(true);
    expect(body.lead.id).toBe("lead-existing");
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("lowercases the email before storing (idempotent dedupe key)", async () => {
    findBotMock.mockResolvedValueOnce({
      id: BOT_ID,
      userId: "u-1",
      name: "Jane Doe",
    });
    findLeadMock.mockResolvedValueOnce(undefined);

    await POST(
      makePost({
        name: "Rec",
        email: "Rec@Example.COM",
        company: "Acme",
        conversationId: CONV_ID,
      }),
      PARAMS,
    );

    expect(txCalls.leadInsertValues?.email).toBe("rec@example.com");
  });

  it("includes CORS headers on the POST response", async () => {
    findBotMock.mockResolvedValueOnce({
      id: BOT_ID,
      userId: "u-1",
      name: "Jane Doe",
    });
    findLeadMock.mockResolvedValueOnce(undefined);

    const res = await POST(
      makePost({ email: "rec@example.com", conversationId: CONV_ID }),
      PARAMS,
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("returns 500 + warn-logs when the transaction throws (rolled back atomically)", async () => {
    findBotMock.mockResolvedValueOnce({
      id: BOT_ID,
      userId: "u-1",
      name: "Jane Doe",
    });
    findLeadMock.mockResolvedValueOnce(undefined);
    transactionMock.mockReset().mockImplementationOnce(async () => {
      throw new Error("db blew up");
    });

    const res = await POST(
      makePost({ email: "rec@example.com", conversationId: CONV_ID }),
      PARAMS,
    );
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("capture_failed");
  });

  it("uses the 24h email-only fallback dedupe when no conversationId is supplied", async () => {
    findBotMock.mockResolvedValueOnce({
      id: BOT_ID,
      userId: "u-1",
      name: "Jane Doe",
    });
    selectMock.mockReturnValueOnce(
      chainResolving([
        {
          id: "lead-existing",
          email: "rec@example.com",
          contextSummary: null,
          conversationId: null,
          capturedAt: new Date(),
        },
      ]),
    );

    const res = await POST(makePost({ name: "Rec", email: "rec@example.com", company: "Acme" }), PARAMS);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { deduped: boolean };
    expect(body.deduped).toBe(true);
  });
});
