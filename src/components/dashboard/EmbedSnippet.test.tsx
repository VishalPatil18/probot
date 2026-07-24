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

  function normalize(s: string): string {
    return s.replace(/\s+/g, "");
  }

  it("shows the public chat URL", () => {
    const { container } = render(<EmbedSnippet {...baseProps} />);
    const urlPanel = container.querySelector("#embed-panel-url pre");
    expect(urlPanel).not.toBeNull();
    expect(normalize(urlPanel?.textContent ?? "")).toContain(
      "https://pro-bot.dev/u/jane-doe/chat",
    );
  });

  it("renders the <script> embed snippet with the botId injected", () => {
    const { container } = render(<EmbedSnippet {...baseProps} />);
    const embedPanel = container.querySelector("#embed-panel-embed pre");
    expect(embedPanel).not.toBeNull();
    const text = normalize(embedPanel?.textContent ?? "");
    expect(text).toContain(`src="https://pro-bot.dev/widget.js"`);
    expect(text).toContain(
      `data-bot-id="11111111-1111-1111-1111-111111111111"`,
    );
  });

  it("renders the signature badge HTML in a pre block", () => {
    const { container } = render(<EmbedSnippet {...baseProps} />);
    const signaturePanel = container.querySelector(
      "#embed-panel-signature pre",
    );
    expect(signaturePanel).not.toBeNull();
    expect(signaturePanel?.textContent ?? "").toContain(
      "Chat with my AI · pro-bot.dev/u/jane-doe",
    );
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
