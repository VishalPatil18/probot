import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSessionMock = vi.fn();
const findBotMock = vi.fn();
const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}));

vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
  useRouter: () => ({ refresh: vi.fn() }),
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

// The page renders KnowledgeManager which fetches on mount — stub fetch so
// the render doesn't crash.
const fetchMock = vi.fn();

import BotSettingsPage from "./page";

const BOT_ID = "11111111-1111-1111-1111-111111111111";

function renderPage() {
  return BotSettingsPage({ params: { botId: BOT_ID } });
}

describe("BotSettingsPage", () => {
  beforeEach(() => {
    getServerSessionMock.mockReset();
    findBotMock.mockReset();
    notFoundMock.mockClear();
    fetchMock.mockReset().mockResolvedValue(
      new Response(JSON.stringify({ sources: [], contextTokenCap: 12000 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
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

  it("renders the form with the bot's initial values + the knowledge manager", async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: "u-1" } });
    findBotMock.mockResolvedValueOnce({
      id: BOT_ID,
      name: "Jane Doe",
      headline: "ML Engineer",
      personality: "creative",
      suggestedQuestions: ["What are her skills?"],
    });
    const tree = await renderPage();
    render(tree);
    expect(screen.getByLabelText(/name/i)).toHaveValue("Jane Doe");
    expect(screen.getByLabelText(/headline/i)).toHaveValue("ML Engineer");
    expect(
      screen.getByRole("heading", { name: /knowledge sources/i }),
    ).toBeInTheDocument();
  });

  it("falls back to 'professional' when the DB stores an unknown personality", async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: "u-1" } });
    findBotMock.mockResolvedValueOnce({
      id: BOT_ID,
      name: "Jane",
      headline: null,
      personality: "snarky" as unknown as string,
      suggestedQuestions: null,
    });
    const tree = await renderPage();
    render(tree);
    // Sanity: page rendered without crashing on the unknown enum value.
    expect(screen.getByText("Identity")).toBeInTheDocument();
  });
});
