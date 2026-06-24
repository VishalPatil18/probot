/*
 * ProBot embeddable widget
 *
 * Usage:
 *   <script src="https://pro-bot.dev/widget.js" data-bot-id="<uuid>"></script>
 *
 * Optional:
 *   data-api-base="https://staging.pro-bot.dev"
 *
 * The script reads its config from its own <script> tag, fetches the bot's
 * public config from /api/bots/[botId]/config, attaches a Shadow DOM to the
 * host page (so host CSS cannot leak in), and renders a floating bubble
 * with a "preview" dialog. Real chat functionality is gated behind a later change
 * (encrypted-at-rest keys); for now the dialog directs visitors to the
 * full /u/[username]/chat page via a CTA link.
 */

// Build-time defines (esbuild --define).
// At runtime these are inlined as string literals.
declare const __WIDGET_CSS__: string;
declare const __API_BASE_DEFAULT__: string;

export interface WidgetConfig {
  bot: {
    id: string;
    name: string;
    headline: string | null;
    themeColor: string;
    image: string | null;
    suggestedQuestions: string[];
  };
  owner: {
    username: string;
    name: string | null;
    image: string | null;
  };
}

// Escape user-controlled strings before interpolating into HTML. We render
// `bot.name`, `owner.name`, `bot.headline`, and `suggestedQuestions[]` -
// all of which come from the bot owner's free-text input. Owners can be
// adversarial vs. the visitors browsing the embed surface.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Hex-color validator mirrors the server-side regex (#RRGGBB only).
// Falls back to the brand purple if the config has been tampered with.
const THEME_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const FALLBACK_THEME = "#7c5cff";

export function safeThemeColor(value: unknown): string {
  return typeof value === "string" && THEME_COLOR_RE.test(value)
    ? value
    : FALLBACK_THEME;
}

// Narrow the GET /api/bots/[botId]/config response into our WidgetConfig.
// Returns null if any required field is missing so the caller can bail
// cleanly without rendering a half-broken widget.
export function parseConfig(raw: unknown): WidgetConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const bot = obj.bot as Record<string, unknown> | undefined;
  const owner = obj.owner as Record<string, unknown> | undefined;
  if (!bot || !owner) return null;

  const botId = bot.id;
  const botName = bot.name;
  const ownerUsername = owner.username;
  if (
    typeof botId !== "string" ||
    typeof botName !== "string" ||
    typeof ownerUsername !== "string"
  ) {
    return null;
  }

  const suggested = Array.isArray(bot.suggestedQuestions)
    ? bot.suggestedQuestions.filter(
        (q): q is string => typeof q === "string" && q.length > 0,
      )
    : [];

  return {
    bot: {
      id: botId,
      name: botName,
      headline: typeof bot.headline === "string" ? bot.headline : null,
      themeColor: safeThemeColor(bot.themeColor),
      image: typeof bot.image === "string" ? bot.image : null,
      suggestedQuestions: suggested,
    },
    owner: {
      username: ownerUsername,
      name: typeof owner.name === "string" ? owner.name : null,
      image: typeof owner.image === "string" ? owner.image : null,
    },
  };
}

// Pure renderer for the bubble's inner SVG icon. Extracted so tests can
// snapshot the markup without spinning up the full Shadow DOM.
export function renderBubbleInner(): string {
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7
               8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8
               8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1
               8 8v.5z" />
    </svg>
  `;
}

// Pure renderer for the dialog's inner markup. Tests assert escaping +
// theme color application without depending on the DOM.
export function renderDialogInner(
  config: WidgetConfig,
  apiBase: string,
): string {
  const { bot, owner } = config;
  const displayName = owner.name ?? owner.username;
  const chatUrl = `${apiBase}/u/${encodeURIComponent(owner.username)}/chat`;
  // Prefer the bot's own picture; fall back to the owner's photo, then a plain
  // placeholder. The bot avatar is the widget's primary identity.
  const avatarSrc = bot.image ?? owner.image;
  const avatarHtml = avatarSrc
    ? `<img class="probot-avatar" src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(bot.name)}" />`
    : `<div class="probot-avatar" aria-hidden="true"></div>`;

  const suggestedHtml =
    bot.suggestedQuestions.length > 0
      ? `<p class="probot-suggested-label">Suggested questions</p>
         <ul class="probot-suggested">
           ${bot.suggestedQuestions
             .slice(0, 4)
             .map((q) => `<li>${escapeHtml(q)}</li>`)
             .join("")}
         </ul>`
      : "";

  return `
    <header class="probot-header">
      ${avatarHtml}
      <div class="probot-titles">
        <div class="probot-title">${escapeHtml(displayName)}</div>
        ${bot.headline ? `<div class="probot-subtitle">${escapeHtml(bot.headline)}</div>` : ""}
      </div>
      <button type="button" class="probot-close" aria-label="Close" data-action="close">×</button>
    </header>
    <div class="probot-body">
      <p class="probot-greeting">Hi! I'm ${escapeHtml(bot.name)}, ${escapeHtml(displayName)}'s AI.</p>
      <div class="probot-notice">
        Widget chat is in preview. Open the full conversation to talk to me.
      </div>
      <a class="probot-cta" href="${escapeHtml(chatUrl)}" target="_blank" rel="noopener noreferrer">
        Open full chat ↗
      </a>
      ${suggestedHtml}
    </div>
    <footer class="probot-footer">
      <a href="${escapeHtml(apiBase)}" target="_blank" rel="noopener noreferrer">
        Powered by ProBot
      </a>
    </footer>
  `;
}

// Read configuration from the script tag's data attributes. Exported so
// tests can build a fake `currentScript` and assert the contract.
export function readScriptConfig(
  script: HTMLScriptElement | null,
): { botId: string; apiBase: string } | null {
  if (!script) return null;
  const botId = script.getAttribute("data-bot-id");
  if (!botId) return null;
  const apiBaseAttr = script.getAttribute("data-api-base");
  const apiBase =
    typeof apiBaseAttr === "string" && /^https?:\/\//.test(apiBaseAttr)
      ? apiBaseAttr.replace(/\/$/, "")
      : __API_BASE_DEFAULT__;
  return { botId, apiBase };
}

// Mount the widget into the host page. Exposed for tests; the IIFE wrapper
// below calls it once when the script tag executes.
export async function mount(
  script: HTMLScriptElement | null,
  doc: Document = document,
): Promise<void> {
  const config = readScriptConfig(script);
  if (!config) return;

  let raw: unknown;
  try {
    const res = await fetch(
      `${config.apiBase}/api/bots/${encodeURIComponent(config.botId)}/config`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return;
    raw = await res.json();
  } catch {
    // Silent failure - the widget should never throw on the host page.
    return;
  }

  const widgetConfig = parseConfig(raw);
  if (!widgetConfig) return;

  const host = doc.createElement("div");
  host.setAttribute("data-probot-widget", "");
  doc.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "closed" });

  const style = doc.createElement("style");
  style.textContent = __WIDGET_CSS__;
  shadow.appendChild(style);

  const root = doc.createElement("div");
  root.className = "probot-root";
  root.style.setProperty("--probot-theme", widgetConfig.bot.themeColor);

  const bubble = doc.createElement("button");
  bubble.type = "button";
  bubble.className = "probot-bubble";
  bubble.setAttribute("aria-label", `Open chat with ${widgetConfig.bot.name}`);
  bubble.innerHTML = renderBubbleInner();

  const dialog = doc.createElement("div");
  dialog.className = "probot-dialog";
  dialog.hidden = true;
  dialog.innerHTML = renderDialogInner(widgetConfig, config.apiBase);

  bubble.addEventListener("click", () => {
    dialog.hidden = !dialog.hidden;
  });
  dialog.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.dataset.action === "close") {
      dialog.hidden = true;
    }
  });

  root.appendChild(bubble);
  root.appendChild(dialog);
  shadow.appendChild(root);
}

// Auto-mount on script execution. `document.currentScript` is the script
// tag the browser is currently executing - only present for sync,
// non-module scripts (which is exactly how we ship widget.js).
if (typeof document !== "undefined") {
  void mount(document.currentScript as HTMLScriptElement | null);
}
