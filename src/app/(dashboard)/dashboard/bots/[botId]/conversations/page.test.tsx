import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSessionMock = vi.fn();
const findBotMock = vi.fn();
const listConversationsMock = vi.fn();
const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}));

vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
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
  listConversations: (...args: unknown[]) => listConversationsMock(...args),
}));

import ConversationsListPage from "./page";

const BOT_ID = "11111111-1111-1111-1111-111111111111";

function renderPage(params: { searchParams?: Record<string, string> } = {}) {
  return ConversationsListPage({
    params: { botId: BOT_ID },
    searchParams: params.searchParams ?? {},
  });
}

describe("ConversationsListPage", () => {
  beforeEach(() => {
    getServerSessionMock.mockReset();
    findBotMock.mockReset();
    listConversationsMock.mockReset();
    notFoundMock.mockClear();
  });

  it("calls notFound when there is no session", async () => {
    getServerSessionMock.mockResolvedValueOnce(null);
    await expect(renderPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("calls notFound when the bot is not owned by the session user", async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: "u-1" } });
    findBotMock.mockResolvedValueOnce(undefined);
    await expect(renderPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders the empty state when no conversations match", async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: "u-1" } });
    findBotMock.mockResolvedValueOnce({ id: BOT_ID, name: "Jane Doe" });
    listConversationsMock.mockResolvedValueOnce({ items: [], total: 0 });
    const tree = await renderPage();
    render(tree);
    expect(screen.getByText(/no one has chatted with jane doe yet/i)).toBeInTheDocument();
  });

  it("renders an empty-search variant when ?q= is set and no matches", async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: "u-1" } });
    findBotMock.mockResolvedValueOnce({ id: BOT_ID, name: "Jane Doe" });
    listConversationsMock.mockResolvedValueOnce({ items: [], total: 0 });
    const tree = await renderPage({ searchParams: { q: "python" } });
    render(tree);
    expect(screen.getByText(/no conversations match "python"/i)).toBeInTheDocument();
  });

  it("renders the conversation list and forwards the search query", async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: "u-1" } });
    findBotMock.mockResolvedValueOnce({ id: BOT_ID, name: "Jane Doe" });
    listConversationsMock.mockResolvedValueOnce({
      items: [
        {
          id: "conv-1",
          sessionId: "ses-1",
          recruiterEmail: "rec@example.com",
          messageCount: 4,
          startedAt: new Date(Date.now() - 60_000),
          lastMessageAt: new Date(Date.now() - 30_000),
          firstUserMessage: "tell me about her ML work",
        },
      ],
      total: 1,
    });

    const tree = await renderPage({ searchParams: { q: "ml" } });
    render(tree);

    expect(screen.getByText("rec@example.com")).toBeInTheDocument();
    expect(screen.getByText("tell me about her ML work")).toBeInTheDocument();
    expect(screen.getByText(/4 msgs/)).toBeInTheDocument();

    // Search query is forwarded to the shared query
    expect(listConversationsMock).toHaveBeenCalledWith(
      expect.objectContaining({ botId: BOT_ID, q: "ml" }),
    );
  });

  it("labels conversations without a recruiter email as Anonymous", async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: "u-1" } });
    findBotMock.mockResolvedValueOnce({ id: BOT_ID, name: "Jane Doe" });
    listConversationsMock.mockResolvedValueOnce({
      items: [
        {
          id: "conv-2",
          sessionId: "ses-2",
          recruiterEmail: null,
          messageCount: 2,
          startedAt: new Date(),
          lastMessageAt: new Date(),
          firstUserMessage: "hi there",
        },
      ],
      total: 1,
    });
    const tree = await renderPage();
    render(tree);
    expect(screen.getByText("Anonymous")).toBeInTheDocument();
  });
});
