import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireBotOwnerMock = vi.fn();
const selectMock = vi.fn();

vi.mock("@/lib/bots/require-bot-owner", () => ({
  requireBotOwner: (...args: unknown[]) => requireBotOwnerMock(...args),
}));

vi.mock("@/lib/db", () => ({
  db: { select: (...args: unknown[]) => selectMock(...args) },
  leads: {
    botId: "l.bot_id",
    capturedAt: "l.captured_at",
    email: "l.email",
    contextSummary: "l.context_summary",
    conversationId: "l.conv_id",
  },
}));

import { GET } from "./route";

const BOT_ID = "11111111-1111-1111-1111-111111111111";
const PARAMS = { params: { botId: BOT_ID } };

function chainResolving(value: unknown) {
  const chain: Record<string, unknown> = {};
  const ret = () => chain;
  chain.from = ret;
  chain.where = ret;
  chain.orderBy = ret;
  chain.limit = ret;
  chain.then = (resolve: (v: unknown) => void) => resolve(value);
  return chain;
}

describe("GET /api/bots/[botId]/leads/export", () => {
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

  it("returns a CSV with the 5 columns + attachment headers + BOM", async () => {
    requireBotOwnerMock.mockResolvedValueOnce({
      ok: true,
      bot: { id: BOT_ID, name: "Jane Doe" },
      userId: "u-1",
    });
    selectMock.mockReturnValueOnce(
      chainResolving([
        {
          capturedAt: new Date("2026-06-19T12:34:56Z"),
          email: "rec@example.com",
          contextSummary: "asked, about ML",
          conversationId: "conv-1",
        },
        {
          capturedAt: new Date("2026-06-18T09:00:00Z"),
          email: "rec2@example.com",
          contextSummary: null,
          conversationId: null,
        },
      ]),
    );

    const res = await GET(new Request("http://localhost/"), PARAMS);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    const disposition = res.headers.get("Content-Disposition") ?? "";
    expect(disposition).toContain("attachment");
    expect(disposition).toContain("leads-Jane-Doe-");
    expect(disposition).toContain(".csv");

    // The wire bytes start with the UTF-8 BOM (`EF BB BF`). `res.text()`
    // strips it by default via TextDecoder, so we inspect the raw bytes
    // for the BOM and use `res.text()` separately for content assertions.
    const bytes = new Uint8Array(await res.clone().arrayBuffer());
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);

    const body = await res.text();
    expect(body).toContain(
      "captured_at,email,bot_name,context_summary,conversation_id",
    );
    // Comma-containing cell is quoted
    expect(body).toContain('"asked, about ML"');
    // Bot name is embedded in every row
    expect(body).toContain("Jane Doe");
    // Null cells render as empty fields
    expect(body).toContain("rec2@example.com,Jane Doe,,");
  });

  it("emits a header-only CSV when there are no leads", async () => {
    requireBotOwnerMock.mockResolvedValueOnce({
      ok: true,
      bot: { id: BOT_ID, name: "Jane Doe" },
      userId: "u-1",
    });
    selectMock.mockReturnValueOnce(chainResolving([]));

    const res = await GET(new Request("http://localhost/"), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain(
      "captured_at,email,bot_name,context_summary,conversation_id\r\n",
    );
  });

  it("sanitizes the bot name for the filename (drops unsafe chars)", async () => {
    requireBotOwnerMock.mockResolvedValueOnce({
      ok: true,
      bot: { id: BOT_ID, name: 'Jane "Doe" / O\\Reilly' },
      userId: "u-1",
    });
    selectMock.mockReturnValueOnce(chainResolving([]));

    const res = await GET(new Request("http://localhost/"), PARAMS);
    const disposition = res.headers.get("Content-Disposition") ?? "";
    // ASCII fallback `filename="..."` must not contain `\` or unescaped `"`
    // — the only `"` chars allowed are the wrapping ones around each value.
    expect(disposition).not.toContain("\\");
    expect(disposition).toMatch(
      /filename="leads-[A-Za-z0-9._-]+-\d{4}-\d{2}-\d{2}\.csv"/,
    );
  });

  it("includes an RFC 5987 filename* parameter so non-ASCII bot names render correctly", async () => {
    requireBotOwnerMock.mockResolvedValueOnce({
      ok: true,
      bot: { id: BOT_ID, name: "Jané Doe 日本" },
      userId: "u-1",
    });
    selectMock.mockReturnValueOnce(chainResolving([]));

    const res = await GET(new Request("http://localhost/"), PARAMS);
    const disposition = res.headers.get("Content-Disposition") ?? "";
    expect(disposition).toContain("filename*=UTF-8''");
    // The percent-encoded UTF-8 of "Jané" starts with `Jan%C3%A9`
    expect(disposition).toContain("Jan%C3%A9");
  });
});
