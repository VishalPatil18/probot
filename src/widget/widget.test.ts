// @vitest-environment jsdom
//
// Tests for the embeddable widget. Two layers:
//   1. Pure functions (escapeHtml, parseConfig, safeThemeColor, renderers)
//      - straight calls, no DOM, no globals.
//   2. mount() integration - exercise the full DOM flow via jsdom: a mock
//      <script> tag, a stubbed fetch, then assert the shadow root markup.
//
// Build-time defines (__WIDGET_CSS__, __API_BASE_DEFAULT__) are declared in
// widget.ts. The test runner does NOT replace them, so vitest will fail to
// import widget.ts unless we provide a stub. We use vi.stubGlobal in a
// shared setup block below.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("__WIDGET_CSS__", ".test-stub{color:red}");
vi.stubGlobal("__API_BASE_DEFAULT__", "https://pro-bot.dev");

import {
  escapeHtml,
  mount,
  parseConfig,
  readScriptConfig,
  renderBubbleInner,
  renderDialogInner,
  renderMarkdown,
  safeThemeColor,
  type WidgetConfig,
} from "./widget";

const FULL_CONFIG: WidgetConfig = {
  bot: {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Jane Doe",
    headline: "Senior ML Engineer",
    themeColor: "#7c5cff",
    image: null,
    suggestedQuestions: ["What does she do?", "Tell me about her ML work."],
  },
  owner: {
    username: "jane-doe",
    name: "Jane Doe",
    image: "https://res.cloudinary.com/dbjdu0hvl/image/upload/v1/1.webp",
  },
};

describe("escapeHtml", () => {
  it("escapes the five HTML special characters", () => {
    expect(escapeHtml('<script>"alert"&\'')).toBe(
      "&lt;script&gt;&quot;alert&quot;&amp;&#39;",
    );
  });

  it("returns identity for safe strings", () => {
    expect(escapeHtml("plain text 123")).toBe("plain text 123");
  });

  it("handles an empty string", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("escapes ampersand first so double-encoding does not happen", () => {
    // If `&` were escaped after `<`, the `&lt;` would itself get its `&`
    // escaped to `&amp;lt;`. The implementation order matters; this test
    // pins it.
    expect(escapeHtml("&<")).toBe("&amp;&lt;");
  });
});

describe("safeThemeColor", () => {
  it("accepts a valid #RRGGBB string", () => {
    expect(safeThemeColor("#7c5cff")).toBe("#7c5cff");
    expect(safeThemeColor("#000000")).toBe("#000000");
    expect(safeThemeColor("#FFFFFF")).toBe("#FFFFFF");
  });

  it("falls back to the brand color on invalid input", () => {
    expect(safeThemeColor("not-a-color")).toBe("#7c5cff");
    expect(safeThemeColor("#fff")).toBe("#7c5cff");
    expect(safeThemeColor("javascript:alert(1)")).toBe("#7c5cff");
    expect(safeThemeColor(null)).toBe("#7c5cff");
    expect(safeThemeColor(undefined)).toBe("#7c5cff");
    expect(safeThemeColor(42)).toBe("#7c5cff");
  });
});

describe("parseConfig", () => {
  it("returns null for null, undefined, or non-objects", () => {
    expect(parseConfig(null)).toBeNull();
    expect(parseConfig(undefined)).toBeNull();
    expect(parseConfig("string")).toBeNull();
    expect(parseConfig(123)).toBeNull();
  });

  it("returns null when bot or owner key is missing", () => {
    expect(parseConfig({ bot: {} })).toBeNull();
    expect(parseConfig({ owner: {} })).toBeNull();
    expect(parseConfig({})).toBeNull();
  });

  it("returns null when required string fields are wrong type", () => {
    expect(
      parseConfig({
        bot: { id: 1, name: "n" },
        owner: { username: "u" },
      }),
    ).toBeNull();
    expect(
      parseConfig({
        bot: { id: "1", name: "n" },
        owner: { username: 42 },
      }),
    ).toBeNull();
  });

  it("happy path returns a fully-typed WidgetConfig", () => {
    const result = parseConfig({
      bot: {
        id: "abc",
        name: "Jane",
        headline: "ML",
        themeColor: "#ff00aa",
        suggestedQuestions: ["q1", "q2"],
      },
      owner: { username: "jane", name: "Jane", image: "https://x/y.jpg" },
    });
    expect(result).toEqual({
      bot: {
        id: "abc",
        name: "Jane",
        headline: "ML",
        themeColor: "#ff00aa",
        suggestedQuestions: ["q1", "q2"],
      },
      owner: { username: "jane", name: "Jane", image: "https://x/y.jpg" },
    });
  });

  it("normalizes missing optional fields to null", () => {
    const result = parseConfig({
      bot: { id: "abc", name: "Jane" },
      owner: { username: "jane" },
    });
    expect(result?.bot.headline).toBeNull();
    expect(result?.owner.name).toBeNull();
    expect(result?.owner.image).toBeNull();
  });

  it("falls back to safe theme color when themeColor is invalid", () => {
    const result = parseConfig({
      bot: { id: "abc", name: "Jane", themeColor: "javascript:alert(1)" },
      owner: { username: "jane" },
    });
    expect(result?.bot.themeColor).toBe("#7c5cff");
  });

  it("drops non-string entries from suggestedQuestions", () => {
    const result = parseConfig({
      bot: {
        id: "abc",
        name: "Jane",
        suggestedQuestions: ["ok", 42, null, "", "good"],
      },
      owner: { username: "jane" },
    });
    expect(result?.bot.suggestedQuestions).toEqual(["ok", "good"]);
  });
});

describe("renderBubbleInner", () => {
  it("contains an svg element", () => {
    expect(renderBubbleInner()).toContain("<svg");
  });

  it("marks the icon as aria-hidden so the button label is authoritative", () => {
    expect(renderBubbleInner()).toContain('aria-hidden="true"');
  });
});

describe("renderMarkdown", () => {
  it("wraps a plain line in a paragraph", () => {
    expect(renderMarkdown("hello world")).toBe("<p>hello world</p>");
  });

  it("renders bold, italic, and inline code", () => {
    const out = renderMarkdown("**b**, *i*, `c`");
    expect(out).toContain("<strong>b</strong>");
    expect(out).toContain("<em>i</em>");
    expect(out).toContain("<code>c</code>");
  });

  it("renders links with target=_blank and rel=noopener", () => {
    const out = renderMarkdown("see [docs](https://pro-bot.dev/docs)");
    expect(out).toContain(
      '<a href="https://pro-bot.dev/docs" target="_blank" rel="noopener noreferrer">docs</a>',
    );
  });

  it("collapses non-http(s)/mailto link schemes to # (defuses javascript: URLs)", () => {
    const out = renderMarkdown("[x](javascript:alert(1))");
    expect(out).not.toContain("javascript:");
    expect(out).toContain('href="#"');
  });

  it("HTML-escapes tag-shaped LLM output so <script> can't execute", () => {
    const out = renderMarkdown("hi <script>alert(1)</script>");
    expect(out).not.toContain("<script>alert(1)</script>");
    expect(out).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("renders unordered lists", () => {
    const out = renderMarkdown("- one\n- two");
    expect(out).toBe("<ul><li>one</li><li>two</li></ul>");
  });

  it("renders ordered lists", () => {
    const out = renderMarkdown("1. one\n2. two");
    expect(out).toBe("<ol><li>one</li><li>two</li></ol>");
  });

  it("renders fenced code blocks and escapes their contents", () => {
    const out = renderMarkdown("```\n<x>\n```");
    expect(out).toBe("<pre><code>&lt;x&gt;</code></pre>");
  });

  it("renders headings", () => {
    expect(renderMarkdown("# h1")).toBe("<h1>h1</h1>");
    expect(renderMarkdown("### h3")).toBe("<h3>h3</h3>");
  });

  it("does not double-render markdown inside inline code", () => {
    const out = renderMarkdown("`**not bold**`");
    expect(out).toContain("<code>**not bold**</code>");
    expect(out).not.toContain("<strong>not bold</strong>");
  });
});

describe("renderDialogInner", () => {
  it("includes the owner's display name and bot headline", () => {
    const html = renderDialogInner(FULL_CONFIG, "https://pro-bot.dev");
    expect(html).toContain("Jane Doe");
    expect(html).toContain("Senior ML Engineer");
  });

  it("escapes HTML-injected owner names and headlines", () => {
    const malicious: WidgetConfig = {
      ...FULL_CONFIG,
      owner: {
        ...FULL_CONFIG.owner,
        name: "<img src=x onerror=alert(1)>",
      },
      bot: {
        ...FULL_CONFIG.bot,
        headline: "</script><script>alert(1)</script>",
      },
    };
    const html = renderDialogInner(malicious, "https://pro-bot.dev");
    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("escapes HTML-injected suggested questions", () => {
    const malicious: WidgetConfig = {
      ...FULL_CONFIG,
      bot: {
        ...FULL_CONFIG.bot,
        suggestedQuestions: ["<script>alert(1)</script>"],
      },
    };
    const html = renderDialogInner(malicious, "https://pro-bot.dev");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("builds the CTA URL with apiBase + encoded username", () => {
    const config: WidgetConfig = {
      ...FULL_CONFIG,
      owner: { ...FULL_CONFIG.owner, username: "jane doe" },
    };
    const html = renderDialogInner(config, "https://pro-bot.dev");
    expect(html).toContain("https://pro-bot.dev/u/jane%20doe/chat");
  });

  it("escapes the CTA href so a quoted apiBase cannot break out of the attribute", () => {
    // Regression: previously chatUrl was interpolated unescaped into the
    // href, so a malicious data-api-base like `https://x" onerror="alert(1)`
    // would inject an attribute. After fix the embedded quote is escaped to
    // &quot; and the attribute boundary is preserved.
    const html = renderDialogInner(FULL_CONFIG, 'https://x" onerror="alert(1)');
    expect(html).not.toContain('href="https://x" onerror="');
    expect(html).toContain("&quot;");
  });

  it("omits the suggested-questions section when the list is empty", () => {
    const config: WidgetConfig = {
      ...FULL_CONFIG,
      bot: { ...FULL_CONFIG.bot, suggestedQuestions: [] },
    };
    const html = renderDialogInner(config, "https://pro-bot.dev");
    expect(html).not.toContain("Suggested questions");
  });

  it("renders only the first 5 suggested-question chips", () => {
    const config: WidgetConfig = {
      ...FULL_CONFIG,
      bot: {
        ...FULL_CONFIG.bot,
        suggestedQuestions: ["a", "b", "c", "d", "e", "f"],
      },
    };
    const html = renderDialogInner(config, "https://pro-bot.dev");
    expect(html).toContain('data-question="a"');
    expect(html).toContain('data-question="e"');
    expect(html).not.toContain('data-question="f"');
  });

  it("renders an input row bound to the send form", () => {
    const html = renderDialogInner(FULL_CONFIG, "https://pro-bot.dev");
    expect(html).toContain('data-role="form"');
    expect(html).toContain('data-role="input"');
    expect(html).toContain('data-role="send"');
  });

  it("falls back to username when owner.name is null", () => {
    const config: WidgetConfig = {
      ...FULL_CONFIG,
      owner: { ...FULL_CONFIG.owner, name: null },
    };
    const html = renderDialogInner(config, "https://pro-bot.dev");
    expect(html).toContain("jane-doe");
  });

  it("renders a placeholder avatar when neither bot.image nor owner.image is set", () => {
    const config: WidgetConfig = {
      ...FULL_CONFIG,
      bot: { ...FULL_CONFIG.bot, image: null },
      owner: { ...FULL_CONFIG.owner, image: null },
    };
    const html = renderDialogInner(config, "https://pro-bot.dev");
    // No <img> tag - the placeholder is the theme-tinted fallback circle.
    expect(html).not.toContain('<img class="probot-avatar"');
    expect(html).toContain("probot-avatar-fallback");
  });
});

describe("readScriptConfig", () => {
  it("returns null when script is null", () => {
    expect(readScriptConfig(null)).toBeNull();
  });

  it("returns null when data-bot-id is missing", () => {
    const script = document.createElement("script");
    expect(readScriptConfig(script)).toBeNull();
  });

  it("returns botId + default apiBase when data-bot-id is present", () => {
    const script = document.createElement("script");
    script.setAttribute("data-bot-id", "bot-xyz");
    expect(readScriptConfig(script)).toEqual({
      botId: "bot-xyz",
      apiBase: "https://pro-bot.dev",
    });
  });

  it("uses data-api-base override when it is an http(s) URL", () => {
    const script = document.createElement("script");
    script.setAttribute("data-bot-id", "bot-xyz");
    script.setAttribute("data-api-base", "https://staging.pro-bot.dev");
    expect(readScriptConfig(script)?.apiBase).toBe(
      "https://staging.pro-bot.dev",
    );
  });

  it("strips trailing slash from data-api-base", () => {
    const script = document.createElement("script");
    script.setAttribute("data-bot-id", "bot-xyz");
    script.setAttribute("data-api-base", "https://staging.pro-bot.dev/");
    expect(readScriptConfig(script)?.apiBase).toBe(
      "https://staging.pro-bot.dev",
    );
  });

  it("ignores non-http data-api-base values (defense vs js: / data:)", () => {
    const script = document.createElement("script");
    script.setAttribute("data-bot-id", "bot-xyz");
    script.setAttribute("data-api-base", "javascript:alert(1)");
    expect(readScriptConfig(script)?.apiBase).toBe("https://pro-bot.dev");
  });
});

describe("mount (DOM integration)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal("__WIDGET_CSS__", ".test-stub{color:red}");
    vi.stubGlobal("__API_BASE_DEFAULT__", "https://pro-bot.dev");
  });

  function makeScript(): HTMLScriptElement {
    const s = document.createElement("script");
    s.setAttribute("data-bot-id", "11111111-1111-1111-1111-111111111111");
    return s;
  }

  it("does nothing when script is null", async () => {
    await mount(null);
    expect(document.querySelector("[data-probot-widget]")).toBeNull();
  });

  it("still mounts the bubble when fetch fails", async () => {
    // Behavior change: previously the widget bailed silently on any fetch
    // failure. The bubble now renders first (with the fallback dialog) so
    // visitors always see the entry point.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 500 })),
    );
    await mount(makeScript());
    expect(document.querySelector("[data-probot-widget]")).not.toBeNull();
  });

  it("still mounts the bubble when parseConfig rejects the response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(JSON.stringify({ bot: {} }), { status: 200 }),
      ),
    );
    await mount(makeScript());
    expect(document.querySelector("[data-probot-widget]")).not.toBeNull();
  });

  it("attaches a host element with a closed shadow root on the happy path", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              bot: FULL_CONFIG.bot,
              owner: FULL_CONFIG.owner,
            }),
            { status: 200 },
          ),
      ),
    );
    await mount(makeScript());
    const host = document.querySelector("[data-probot-widget]");
    expect(host).not.toBeNull();
    // mode: "closed" → host.shadowRoot is null even though one exists
    expect((host as HTMLElement).shadowRoot).toBeNull();
  });

  it("queries the config endpoint using apiBase + botId", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            bot: FULL_CONFIG.bot,
            owner: FULL_CONFIG.owner,
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await mount(makeScript());
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/bots/11111111-1111-1111-1111-111111111111/config",
      ),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });
});
