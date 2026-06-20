import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSessionMock = vi.fn();
const findBotMock = vi.fn();
const getConvoMock = vi.fn();
const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}));

vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
}));

vi.mock("@/lib/auth/auth", () => ({ authOptions: {} }));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      bots: { findFirst: (...args: unknown[]) => findBotMock(...args) },
    },
  },
  bots: { id: "b.id", userId: "b.user_id" },
}));

vi.mock("@/lib/conversations/queries", () => ({
  getConversationWithMessages: (...args: unknown[]) => getConvoMock(...args),
}));

import ConversationDetailPage from "./page";

const BOT_ID = "11111111-1111-1111-1111-111111111111";
const CONV_ID = "22222222-2222-2222-2222-222222222222";

function renderPage() {
  return ConversationDetailPage({
    params: { botId: BOT_ID, convId: CONV_ID },
  });
}

describe("ConversationDetailPage", () => {
  beforeEach(() => {
    getServerSessionMock.mockReset();
    findBotMock.mockReset();
    getConvoMock.mockReset();
    notFoundMock.mockClear();
  });

  it("calls notFound when there is no session", async () => {
    getServerSessionMock.mockResolvedValueOnce(null);
    await expect(renderPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("calls notFound when the bot is not owned", async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: "u-1" } });
    findBotMock.mockResolvedValueOnce(undefined);
    await expect(renderPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("calls notFound when the conversation does not exist for this bot", async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: "u-1" } });
    findBotMock.mockResolvedValueOnce({ id: BOT_ID, name: "Jane Doe" });
    getConvoMock.mockResolvedValueOnce(null);
    await expect(renderPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders the transcript with messages in order + the recruiter email + mailto button", async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: "u-1" } });
    findBotMock.mockResolvedValueOnce({ id: BOT_ID, name: "Jane Doe" });
    getConvoMock.mockResolvedValueOnce({
      id: CONV_ID,
      sessionId: "ses-1",
      recruiterEmail: "rec@example.com",
      messageCount: 2,
      startedAt: new Date("2026-06-19T10:00:00Z"),
      lastMessageAt: new Date("2026-06-19T10:01:00Z"),
      messages: [
        {
          id: "m1",
          role: "user",
          content: "hi",
          createdAt: new Date("2026-06-19T10:00:00Z"),
        },
        {
          id: "m2",
          role: "assistant",
          content: "hello there",
          createdAt: new Date("2026-06-19T10:00:01Z"),
        },
      ],
    });

    const tree = await renderPage();
    render(tree);

    expect(screen.getByText("rec@example.com")).toBeInTheDocument();
    expect(screen.getByText("hi")).toBeInTheDocument();
    expect(screen.getByText("hello there")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /email back/i }).getAttribute("href")).toBe(
      "mailto:rec@example.com",
    );
  });

  it("renders 'Anonymous conversation' and no mailto button when recruiter email is null", async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: "u-1" } });
    findBotMock.mockResolvedValueOnce({ id: BOT_ID, name: "Jane Doe" });
    getConvoMock.mockResolvedValueOnce({
      id: CONV_ID,
      sessionId: "ses-1",
      recruiterEmail: null,
      messageCount: 0,
      startedAt: new Date(),
      lastMessageAt: new Date(),
      messages: [],
    });
    const tree = await renderPage();
    render(tree);
    expect(screen.getByText(/anonymous conversation/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /email back/i })).toBeNull();
    expect(screen.getByText(/has no messages/i)).toBeInTheDocument();
  });
});
