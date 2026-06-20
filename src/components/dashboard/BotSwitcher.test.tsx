import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(dashboard)/actions", () => ({
  selectBotAction: vi.fn(),
}));

import { BotSwitcher } from "./BotSwitcher";

describe("BotSwitcher", () => {
  it("renders the selected bot name + URL", () => {
    render(
      <BotSwitcher
        bots={[{ id: "b-1", name: "Jane Doe" }]}
        selectedBotId="b-1"
        selectedBotName="Jane Doe"
        publicUrl="probot.com/u/jane"
      />,
    );
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("probot.com/u/jane")).toBeInTheDocument();
  });

  it("disables the toggle (no caret, no expand) when the user has a single bot", () => {
    render(
      <BotSwitcher
        bots={[{ id: "b-1", name: "Jane Doe" }]}
        selectedBotId="b-1"
        selectedBotName="Jane Doe"
        publicUrl="probot.com/u/jane"
      />,
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens the dropdown when clicked with multiple bots", () => {
    render(
      <BotSwitcher
        bots={[
          { id: "b-1", name: "Jane Doe" },
          { id: "b-2", name: "Side Project Bot" },
        ]}
        selectedBotId="b-1"
        selectedBotName="Jane Doe"
        publicUrl="probot.com/u/jane"
      />,
    );
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    const menu = screen.getByRole("menu", { name: /switch bot/i });
    expect(menu).toBeInTheDocument();
    expect(screen.getByText("Side Project Bot")).toBeInTheDocument();
  });

  it("closes the dropdown on ESC", () => {
    render(
      <BotSwitcher
        bots={[
          { id: "b-1", name: "Jane" },
          { id: "b-2", name: "Other" },
        ]}
        selectedBotId="b-1"
        selectedBotName="Jane"
        publicUrl="probot.com/u/jane"
      />,
    );
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("submits a form with the chosen botId when a dropdown item is clicked", () => {
    render(
      <BotSwitcher
        bots={[
          { id: "b-1", name: "Jane" },
          { id: "b-2", name: "Other" },
        ]}
        selectedBotId="b-1"
        selectedBotName="Jane"
        publicUrl="probot.com/u/jane"
      />,
    );
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    const otherBotButton = screen.getByRole("button", { name: /other/i });
    const form = otherBotButton.closest("form");
    expect(form).not.toBeNull();
    const hiddenInput = form!.querySelector(
      'input[name="botId"]',
    ) as HTMLInputElement;
    expect(hiddenInput.value).toBe("b-2");
  });
});
