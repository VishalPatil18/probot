import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MessageBubble } from "./MessageBubble";

describe("MessageBubble", () => {
  it("renders user messages on the right with raw text", () => {
    render(<MessageBubble message={{ id: "u1", role: "user", text: "Hello there" }} />);
    expect(screen.getByText("Hello there")).toBeInTheDocument();
  });

  it("renders bot text through markdown (bold, lists)", () => {
    render(
      <MessageBubble
        message={{
          id: "b1",
          role: "assistant",
          text: "**bold** and an item\n\n- one\n- two",
        }}
      />,
    );
    const strong = screen.getByText("bold");
    expect(strong.tagName).toBe("STRONG");
    expect(screen.getByText("one").closest("li")).toBeInTheDocument();
    expect(screen.getByText("two").closest("li")).toBeInTheDocument();
  });

  it("renders markdown links with safe rel + target attributes", () => {
    render(
      <MessageBubble
        message={{
          id: "b2",
          role: "assistant",
          text: "See [my portfolio](https://example.com).",
        }}
      />,
    );
    const link = screen.getByRole("link", { name: /my portfolio/i });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders the rate-limit sentinel as a special card, not a markdown bubble", () => {
    render(
      <MessageBubble
        message={{ id: "b3", role: "assistant", rateLimitMessage: true }}
      />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/slow down/i)).toBeInTheDocument();
  });

  it("does NOT render raw HTML inside the bot text (no XSS)", () => {
    render(
      <MessageBubble
        message={{
          id: "b4",
          role: "assistant",
          text: '<img src="x" onerror="alert(1)" />malicious',
        }}
      />,
    );
    expect(document.querySelector("img")).toBeNull();
  });
});
