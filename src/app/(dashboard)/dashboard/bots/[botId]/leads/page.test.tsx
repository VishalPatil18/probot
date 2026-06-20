import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSessionMock = vi.fn();
const findBotMock = vi.fn();
const listLeadsMock = vi.fn();
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

vi.mock("@/lib/leads/queries", () => ({
  listLeads: (...args: unknown[]) => listLeadsMock(...args),
}));

import LeadsListPage from "./page";

const BOT_ID = "11111111-1111-1111-1111-111111111111";

function renderPage(searchParams: Record<string, string> = {}) {
  return LeadsListPage({ params: { botId: BOT_ID }, searchParams });
}

describe("LeadsListPage", () => {
  beforeEach(() => {
    getServerSessionMock.mockReset();
    findBotMock.mockReset();
    listLeadsMock.mockReset();
    notFoundMock.mockClear();
  });

  it("calls notFound when there is no session", async () => {
    getServerSessionMock.mockResolvedValueOnce(null);
    await expect(renderPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders the empty state when no leads exist (and hides the Export button)", async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: "u-1" } });
    findBotMock.mockResolvedValueOnce({ id: BOT_ID, name: "Jane Doe" });
    listLeadsMock.mockResolvedValueOnce({ items: [], total: 0 });
    const tree = await renderPage();
    render(tree);
    expect(screen.getByText("No leads captured yet.")).toBeInTheDocument();
    expect(screen.queryByText(/export csv/i)).toBeNull();
  });

  it("renders leads with email, context, capture time and 'View conversation' link", async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: "u-1" } });
    findBotMock.mockResolvedValueOnce({ id: BOT_ID, name: "Jane Doe" });
    listLeadsMock.mockResolvedValueOnce({
      items: [
        {
          id: "l-1",
          email: "rec@example.com",
          contextSummary: "asked about ML experience",
          conversationId: "conv-99",
          capturedAt: new Date("2026-06-19T10:00:00Z"),
        },
      ],
      total: 1,
    });
    const tree = await renderPage();
    render(tree);

    const emailLink = screen.getByRole("link", { name: "rec@example.com" });
    expect(emailLink.getAttribute("href")).toBe("mailto:rec@example.com");
    expect(screen.getByText("asked about ML experience")).toBeInTheDocument();
    const viewLink = screen.getByRole("link", { name: /view conversation/i });
    expect(viewLink.getAttribute("href")).toBe(
      `/dashboard/bots/${BOT_ID}/conversations/conv-99`,
    );
  });

  it("renders the Export CSV anchor pointing at the export endpoint when leads exist", async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: "u-1" } });
    findBotMock.mockResolvedValueOnce({ id: BOT_ID, name: "Jane Doe" });
    listLeadsMock.mockResolvedValueOnce({
      items: [
        {
          id: "l-1",
          email: "a@b.com",
          contextSummary: null,
          conversationId: null,
          capturedAt: new Date(),
        },
      ],
      total: 1,
    });
    const tree = await renderPage();
    render(tree);
    const exportLink = screen.getByRole("link", { name: /export csv/i });
    expect(exportLink.getAttribute("href")).toBe(
      `/api/bots/${BOT_ID}/leads/export`,
    );
    expect(exportLink.hasAttribute("download")).toBe(true);
  });

  it("omits the 'View conversation' link when conversationId is null", async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: "u-1" } });
    findBotMock.mockResolvedValueOnce({ id: BOT_ID, name: "Jane Doe" });
    listLeadsMock.mockResolvedValueOnce({
      items: [
        {
          id: "l-1",
          email: "a@b.com",
          contextSummary: null,
          conversationId: null,
          capturedAt: new Date(),
        },
      ],
      total: 1,
    });
    const tree = await renderPage();
    render(tree);
    expect(screen.queryByRole("link", { name: /view conversation/i })).toBeNull();
  });
});
