import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn() }),
}));

// MobileSidebar's Toggle needs the provider context; we mount a tiny
// fake provider so the Topbar can render without us pulling in the
// real provider's path-change side effects.
vi.mock("./MobileSidebar", () => ({
  MobileSidebarToggle: () => (
    <button type="button" aria-label="Open navigation menu">
      ☰
    </button>
  ),
}));

vi.mock("./NotificationBell", () => ({
  NotificationBell: () => <span data-testid="bell" />,
}));

vi.mock("./CopyUrlButton", () => ({
  // Match the real `{ url, label?, className? }` interface so future
  // test additions on this file don't silently lose `label` text or
  // `className` styling assertions.
  CopyUrlButton: ({
    url,
    label = "Copy link",
    className,
  }: {
    url: string;
    label?: string;
    className?: string;
  }) => (
    <button type="button" className={className} aria-label={`${label}: ${url}`}>
      {label}
    </button>
  ),
}));

import { Topbar } from "./Topbar";

describe("Topbar - title derivation from pathname", () => {
  beforeEach(() => {
    pathname = "/dashboard";
  });

  it("renders 'Dashboard' on the home path", () => {
    pathname = "/dashboard";
    render(<Topbar publicUrl={null} liveBotUrl={null} />);
    expect(
      screen.getByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
  });

  it("renders 'Conversations' on the conversations list path", () => {
    pathname = "/dashboard/bots/abc/conversations";
    render(<Topbar publicUrl={null} liveBotUrl={null} />);
    expect(
      screen.getByRole("heading", { name: "Conversations" }),
    ).toBeInTheDocument();
  });

  it("renders 'Conversation' (singular) on a transcript path", () => {
    pathname = "/dashboard/bots/abc/conversations/xyz";
    render(<Topbar publicUrl={null} liveBotUrl={null} />);
    expect(
      screen.getByRole("heading", { name: "Conversation" }),
    ).toBeInTheDocument();
  });

  it("renders 'Leads' on the leads list path", () => {
    pathname = "/dashboard/bots/abc/leads";
    render(<Topbar publicUrl={null} liveBotUrl={null} />);
    expect(screen.getByRole("heading", { name: "Leads" })).toBeInTheDocument();
  });

  it("renders 'Settings' on the settings path", () => {
    pathname = "/dashboard/bots/abc/settings";
    render(<Topbar publicUrl={null} liveBotUrl={null} />);
    expect(
      screen.getByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
  });

  it("renders 'Bot Factory' on the /new path", () => {
    pathname = "/dashboard/bots/new";
    render(<Topbar publicUrl={null} liveBotUrl={null} />);
    expect(
      screen.getByRole("heading", { name: "Bot Factory" }),
    ).toBeInTheDocument();
  });

  it("falls back to 'Dashboard' on an unknown path", () => {
    pathname = "/totally-unknown-path";
    render(<Topbar publicUrl={null} liveBotUrl={null} />);
    expect(
      screen.getByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
  });
});

describe("Topbar - URL pill + View live bot", () => {
  it("renders the URL pill when publicUrl is provided", () => {
    pathname = "/dashboard";
    render(
      <Topbar
        publicUrl="https://probot.com/u/jane/chat"
        liveBotUrl="https://probot.com/u/jane/chat"
      />,
    );
    // Scheme stripped for display
    expect(screen.getByText("probot.com/u/jane/chat")).toBeInTheDocument();
  });

  it("hides the URL pill when publicUrl is null", () => {
    pathname = "/dashboard";
    render(<Topbar publicUrl={null} liveBotUrl={null} />);
    expect(screen.queryByText(/probot\.com/i)).toBeNull();
  });

  it("hides the View live bot CTA when liveBotUrl is null", () => {
    pathname = "/dashboard";
    render(<Topbar publicUrl="https://probot.com/u/jane" liveBotUrl={null} />);
    expect(screen.queryByRole("link", { name: /view live bot/i })).toBeNull();
  });

  it("renders the View live bot CTA pointing at liveBotUrl when supplied", () => {
    pathname = "/dashboard";
    render(
      <Topbar
        publicUrl="https://probot.com/u/jane"
        liveBotUrl="https://probot.com/u/jane/chat"
      />,
    );
    const link = screen.getByRole("link", { name: /view live bot/i });
    expect(link.getAttribute("href")).toBe("https://probot.com/u/jane/chat");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
