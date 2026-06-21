// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmbedSnippet, signatureBadgeHtml } from "./EmbedSnippet";

describe("EmbedSnippet", () => {
  const baseProps = {
    botId: "11111111-1111-1111-1111-111111111111",
    username: "jane-doe",
    themeColor: "#7c5cff",
    origin: "https://pro-bot.dev",
  };

  it("renders the three snippet cards", () => {
    render(<EmbedSnippet {...baseProps} />);
    expect(screen.getByText("Public URL")).toBeInTheDocument();
    expect(screen.getByText("Website embed")).toBeInTheDocument();
    expect(screen.getByText("Email signature")).toBeInTheDocument();
  });

  it("shows the public chat URL", () => {
    render(<EmbedSnippet {...baseProps} />);
    expect(
      screen.getByText("https://pro-bot.dev/u/jane-doe/chat"),
    ).toBeInTheDocument();
  });

  it("renders the <script> embed snippet with the botId injected", () => {
    render(<EmbedSnippet {...baseProps} />);
    const snippet = screen.getByText(
      /<script src="https:\/\/probot\.dev\/widget\.js" data-bot-id="11111111-1111-1111-1111-111111111111"><\/script>/,
    );
    expect(snippet).toBeInTheDocument();
  });

  it("renders the signature badge HTML in a pre block", () => {
    render(<EmbedSnippet {...baseProps} />);
    // The signature snippet is rendered verbatim in a <pre><code> block.
    expect(
      screen.getByText(/Chat with my AI · probot\.dev\/u\/jane-doe/),
    ).toBeInTheDocument();
  });

  it("uses the bot's theme color in the signature template", () => {
    render(<EmbedSnippet {...baseProps} themeColor="#ff00aa" />);
    const html = signatureBadgeHtml({
      username: "jane-doe",
      themeColor: "#ff00aa",
      origin: "https://pro-bot.dev",
    });
    expect(html).toContain("color:#ff00aa");
  });
});

describe("signatureBadgeHtml", () => {
  it("strips the protocol from the visible label", () => {
    const html = signatureBadgeHtml({
      username: "jane",
      themeColor: "#7c5cff",
      origin: "https://pro-bot.dev",
    });
    expect(html).toContain("pro-bot.dev/u/jane");
    // The visible body should NOT show the leading https:// - only the
    // href attribute carries it. Anchor text is the user-facing slug.
    const innerText = html.replace(/<a [^>]+>/, "").replace(/<\/a>/, "");
    expect(innerText).not.toContain("https://");
  });

  it("keeps the href fully qualified for click-through", () => {
    const html = signatureBadgeHtml({
      username: "jane",
      themeColor: "#7c5cff",
      origin: "https://pro-bot.dev",
    });
    expect(html).toContain('href="https://pro-bot.dev/u/jane/chat"');
  });

  it("respects http (dev) origins", () => {
    const html = signatureBadgeHtml({
      username: "jane",
      themeColor: "#7c5cff",
      origin: "http://localhost:3000",
    });
    expect(html).toContain('href="http://localhost:3000/u/jane/chat"');
    expect(html).toContain("localhost:3000/u/jane");
  });
});
