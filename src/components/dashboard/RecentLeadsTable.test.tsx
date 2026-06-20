import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RecentLeadsTable } from "./RecentLeadsTable";

const BOT_ID = "11111111-1111-1111-1111-111111111111";
const CONV_ID = "22222222-2222-2222-2222-222222222222";

function lead(overrides: Partial<{
  id: string;
  email: string;
  contextSummary: string | null;
  conversationId: string | null;
  capturedAt: Date;
  botId: string;
  botName: string;
}> = {}) {
  return {
    id: "l-1",
    email: "rec@example.com",
    contextSummary: "asked about ML",
    conversationId: CONV_ID,
    capturedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    botId: BOT_ID,
    botName: "Jane",
    ...overrides,
  };
}

describe("RecentLeadsTable", () => {
  it("renders the empty state when no leads", () => {
    render(<RecentLeadsTable leads={[]} />);
    expect(screen.getByText(/no leads captured yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/view all/i)).toBeNull();
  });

  it("renders a row for each lead with email, context, time, and View chat link", () => {
    render(<RecentLeadsTable leads={[lead()]} />);
    expect(screen.getByText("rec@example.com")).toBeInTheDocument();
    expect(screen.getByText("asked about ML")).toBeInTheDocument();
    const viewChat = screen.getByRole("link", { name: /view chat/i });
    expect(viewChat.getAttribute("href")).toBe(
      `/dashboard/bots/${BOT_ID}/conversations/${CONV_ID}`,
    );
  });

  it("derives the company-signal pill from the recruiter email domain", () => {
    render(
      <RecentLeadsTable
        leads={[lead({ email: "sarah.k@stripe.com" })]}
      />,
    );
    expect(screen.getByText("Stripe")).toBeInTheDocument();
  });

  it("does NOT render a company pill for public email providers (gmail, outlook, etc.)", () => {
    render(
      <RecentLeadsTable
        leads={[lead({ email: "someone@gmail.com" })]}
      />,
    );
    expect(screen.queryByText("Gmail")).toBeNull();
  });

  it("extracts the registrable domain for sub-domained emails (mail.stripe.com → Stripe, not Mail)", () => {
    render(
      <RecentLeadsTable
        leads={[lead({ email: "sarah@mail.stripe.com" })]}
      />,
    );
    expect(screen.getByText("Stripe")).toBeInTheDocument();
    expect(screen.queryByText("Mail")).toBeNull();
  });

  it("omits the View chat link when conversationId is null", () => {
    render(
      <RecentLeadsTable leads={[lead({ conversationId: null })]} />,
    );
    expect(screen.queryByRole("link", { name: /view chat/i })).toBeNull();
  });

  it("renders the 'View all' link only when leads exist", () => {
    render(<RecentLeadsTable leads={[lead()]} />);
    expect(screen.getByRole("link", { name: /view all/i })).toBeInTheDocument();
  });
});
