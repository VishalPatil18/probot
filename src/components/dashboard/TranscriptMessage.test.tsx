import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TranscriptMessage } from "./TranscriptMessage";

const SOME_DATE = new Date("2026-06-19T10:30:00Z");

describe("TranscriptMessage", () => {
  it("right-aligns user-role messages", () => {
    const { container } = render(
      <TranscriptMessage role="user" content="hi" createdAt={SOME_DATE} />,
    );
    const outer = container.firstElementChild as HTMLElement;
    expect(outer.className).toContain("justify-end");
    expect(screen.getByText("hi")).toBeInTheDocument();
  });

  it("left-aligns assistant-role messages", () => {
    const { container } = render(
      <TranscriptMessage
        role="assistant"
        content="hello there"
        createdAt={SOME_DATE}
      />,
    );
    const outer = container.firstElementChild as HTMLElement;
    expect(outer.className).toContain("justify-start");
  });

  it("renders markdown bold via react-markdown", () => {
    render(
      <TranscriptMessage
        role="assistant"
        content="this is **bold**"
        createdAt={SOME_DATE}
      />,
    );
    const strong = screen.getByText("bold");
    expect(strong.tagName.toLowerCase()).toBe("strong");
  });

  it("rewrites <a> links to open in a new tab with rel=noopener noreferrer", () => {
    render(
      <TranscriptMessage
        role="assistant"
        content="see [docs](https://example.com)"
        createdAt={SOME_DATE}
      />,
    );
    const link = screen.getByRole("link", { name: "docs" });
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
