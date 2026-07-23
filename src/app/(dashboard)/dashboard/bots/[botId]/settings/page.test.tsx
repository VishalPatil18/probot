import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSessionMock = vi.fn();
const findBotMock = vi.fn();
const findUserMock = vi.fn();
const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

let searchParamsState = new URLSearchParams();

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}));

vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => searchParamsState,
}));

vi.mock("@/lib/auth/auth", () => ({ authOptions: {} }));

const findDeletionMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      bots: { findFirst: (...args: unknown[]) => findBotMock(...args) },
      users: { findFirst: (...args: unknown[]) => findUserMock(...args) },
      deletionRequests: {
        findFirst: (...args: unknown[]) => findDeletionMock(...args),
      },
    },
  },
  bots: { id: "b.id", userId: "b.user_id" },
  users: { id: "u.id" },
  deletionRequests: { userId: "d.user_id" },
}));

const fetchMock = vi.fn();

import BotSettingsPage from "./page";

const BOT_ID = "11111111-1111-1111-1111-111111111111";

function renderPage() {
  return BotSettingsPage({ params: { botId: BOT_ID } });
}

function botFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: BOT_ID,
    name: "Jane Doe",
    headline: "ML Engineer",
    personality: "creative",
    suggestedQuestions: ["What are her skills?"],
    isActive: true,
    themeColor: "#7c5cff",
    ...overrides,
  };
}

const SESSION = {
  user: {
    id: "u-1",
    username: "jane",
    name: "Jane Doe",
    email: "jane@example.com",
  },
};

describe("BotSettingsPage (5-tab)", () => {
  beforeEach(() => {
    getServerSessionMock.mockReset();
    findBotMock.mockReset();
    findUserMock.mockReset().mockResolvedValue({
      llmProvider: "anthropic",
      llmModel: "claude-haiku-4-5",
    });
    notFoundMock.mockClear();
    searchParamsState = new URLSearchParams();
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

  it("calls notFound when the session has no username", async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: "u-1" } });
    await expect(renderPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("calls notFound when the bot is not owned by the session user", async () => {
    getServerSessionMock.mockResolvedValueOnce(SESSION);
    findBotMock.mockResolvedValueOnce(undefined);
    await expect(renderPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders all five tabs in the tab strip", async () => {
    getServerSessionMock.mockResolvedValueOnce(SESSION);
    findBotMock.mockResolvedValueOnce(botFixture());
    const tree = await renderPage();
    render(tree);
    expect(screen.getByRole("tab", { name: /account/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /bot configuration/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /knowledge base/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /security & privacy/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /ai model & api key/i }),
    ).toBeInTheDocument();
  });

  it("defaults to the Account tab when ?tab= is absent", async () => {
    getServerSessionMock.mockResolvedValueOnce(SESSION);
    findBotMock.mockResolvedValueOnce(botFixture());
    const tree = await renderPage();
    render(tree);
    expect(
      screen.getByRole("heading", { name: /^profile$/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/save bot settings/i)).toBeNull();
  });

  it("opens the Bot configuration tab when ?tab=bot", async () => {
    searchParamsState = new URLSearchParams("tab=bot");
    getServerSessionMock.mockResolvedValueOnce(SESSION);
    findBotMock.mockResolvedValueOnce(botFixture());
    const tree = await renderPage();
    render(tree);
    expect(
      screen.getByRole("heading", { name: /bot status/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /save bot settings/i }),
    ).toBeInTheDocument();
  });

  it("opens the Knowledge base tab when ?tab=kb", async () => {
    searchParamsState = new URLSearchParams("tab=kb");
    getServerSessionMock.mockResolvedValueOnce(SESSION);
    findBotMock.mockResolvedValueOnce(botFixture());
    const tree = await renderPage();
    render(tree);
    expect(
      screen.getByRole("heading", { name: /knowledge base/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /re-index all/i }),
    ).toBeInTheDocument();
  });

  it("opens the AI model & key tab when ?tab=model and renders the live editor (Stage 7 Phase 3)", async () => {
    searchParamsState = new URLSearchParams("tab=model");
    getServerSessionMock.mockResolvedValueOnce(SESSION);
    findBotMock.mockResolvedValueOnce(botFixture());
    const tree = await renderPage();
    render(tree);
    expect(
      screen.getByRole("heading", { name: /provider & model/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /managed key storage/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /decrypt audit log/i }),
    ).toBeInTheDocument();
  });

  it("falls back to default tab on an unknown ?tab= value", async () => {
    searchParamsState = new URLSearchParams("tab=nonsense");
    getServerSessionMock.mockResolvedValueOnce(SESSION);
    findBotMock.mockResolvedValueOnce(botFixture());
    const tree = await renderPage();
    render(tree);
    expect(
      screen.getByRole("heading", { name: /^profile$/i }),
    ).toBeInTheDocument();
  });

  it("falls back to 'professional' when the DB stores an unknown personality", async () => {
    searchParamsState = new URLSearchParams("tab=bot");
    getServerSessionMock.mockResolvedValueOnce(SESSION);
    findBotMock.mockResolvedValueOnce(
      botFixture({
        personality: "snarky" as unknown as string,
        suggestedQuestions: null,
        headline: null,
      }),
    );
    const tree = await renderPage();
    render(tree);
    expect(
      screen.getByRole("heading", { name: /bot status/i }),
    ).toBeInTheDocument();
  });
});
