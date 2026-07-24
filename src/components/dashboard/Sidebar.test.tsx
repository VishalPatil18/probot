import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

import { Sidebar } from "./Sidebar";

const baseProps = {
  selectedBotName: "Jane",
  publicUrl: "https://pro-bot.dev/u/jane/chat",
  counts: { conversations: 0, leads: 0 },
  user: { name: "Jane", email: "jane@example.com", initials: "J" },
  llmProvider: null,
  llmModel: null,
};

describe("Sidebar", () => {
  it("hides the Workspace section and shows Create bot when the user has no bots", () => {
    const { container } = render(
      <Sidebar {...baseProps} bots={[]} selectedBotId={null} />,
    );
    expect(screen.queryByText("Workspace")).not.toBeInTheDocument();
    expect(screen.queryByText("Conversations")).not.toBeInTheDocument();
    expect(screen.getByText("Create bot")).toBeInTheDocument();
    expect(
      container.querySelector('a[href="/dashboard/settings"]'),
    ).toBeTruthy();
  });

  it("shows the Workspace section when the user has a bot", () => {
    render(
      <Sidebar
        {...baseProps}
        bots={[{ id: "bot-1", name: "Jane" }]}
        selectedBotId="bot-1"
      />,
    );
    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByText("Bot Factory")).toBeInTheDocument();
    expect(screen.getByText("Conversations")).toBeInTheDocument();
  });
});
