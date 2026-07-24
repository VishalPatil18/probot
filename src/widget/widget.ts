declare const __WIDGET_CSS__: string;
declare const __API_BASE_DEFAULT__: string;

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const blocks: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (/^```/.test(line)) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i] ?? "")) {
        codeLines.push(lines[i] ?? "");
        i++;
      }
      i++;
      blocks.push(
        `<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`,
      );
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      const level = h[1]!.length;
      blocks.push(`<h${level}>${renderInline(h[2]!)}</h${level}>`);
      i++;
      continue;
    }

    if (/^([-*_])\1{2,}\s*$/.test(line)) {
      blocks.push("<hr>");
      i++;
      continue;
    }

    if (/^>/.test(line)) {
      const parts: string[] = [];
      while (i < lines.length && /^>/.test(lines[i] ?? "")) {
        parts.push((lines[i] ?? "").replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        `<blockquote>${renderInline(parts.join("<br>"))}</blockquote>`,
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i] ?? "")) {
        const content = (lines[i] ?? "").replace(/^[-*]\s+/, "");
        items.push(`<li>${renderInline(content)}</li>`);
        i++;
      }
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i] ?? "")) {
        const content = (lines[i] ?? "").replace(/^\d+\.\s+/, "");
        items.push(`<li>${renderInline(content)}</li>`);
        i++;
      }
      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length &&
      (lines[i] ?? "").trim() !== "" &&
      !/^(#{1,6}\s|>|\`\`\`|[-*]\s|\d+\.\s|([-*_])\2{2,}\s*$)/.test(
        lines[i] ?? "",
      )
    ) {
      paragraph.push(lines[i] ?? "");
      i++;
    }
    blocks.push(`<p>${renderInline(paragraph.join("<br>"))}</p>`);
  }
  return blocks.join("");
}

function renderInline(text: string): string {
  let s = escapeHtml(text);

  const codes: string[] = [];
  s = s.replace(/`([^`\n]+)`/g, (_m, c: string) => {
    const idx = codes.push(`<code>${c}</code>`) - 1;
    return `\x00C${idx}\x00`;
  });

  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t: string, u: string) => {
    const safe = /^(https?:|mailto:)/i.test(u) ? u : "#";
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${t}</a>`;
  });

  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  s = s.replace(/(^|\W)_(.+?)_(\W|$)/g, "$1<em>$2</em>$3");
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");

  s = s.replace(/\x00C(\d+)\x00/g, (_m, i: string) => codes[Number(i)] ?? "");
  return s;
}

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

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const THEME_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const FALLBACK_THEME = "#7c5cff";

export function safeThemeColor(value: unknown): string {
  return typeof value === "string" && THEME_COLOR_RE.test(value)
    ? value
    : FALLBACK_THEME;
}

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

export function renderBubbleInner(): string {
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/>
      <path d="M20 2v4"/>
      <path d="M22 4h-4"/>
      <circle cx="4" cy="20" r="2"/>
    </svg>
  `;
}

export function renderFallbackDialogInner(apiBase: string): string {
  return `
    <header class="probot-header">
      <div class="probot-avatar" aria-hidden="true"></div>
      <div class="probot-titles">
        <div class="probot-title">ProBot</div>
      </div>
      <button type="button" class="probot-close" aria-label="Close" data-action="close">×</button>
    </header>
    <div class="probot-body">
      <p class="probot-greeting">Hi! Say hello to your AI assistant.</p>
      <div class="probot-notice">
        The chatbot is warming up. Try again in a moment or open ProBot directly.
      </div>
      <a class="probot-cta" href="${escapeHtml(apiBase)}" target="_blank" rel="noopener noreferrer">
        Visit ProBot ↗
      </a>
    </div>
    <footer class="probot-footer">
      <a href="${escapeHtml(apiBase)}" target="_blank" rel="noopener noreferrer">
        Powered by ProBot
      </a>
    </footer>
  `;
}

export function renderBotAvatar(
  avatarSrc: string | null,
  variant: "header" | "mini",
): string {
  const cls = variant === "header" ? "probot-avatar" : "probot-avatar-mini";
  if (avatarSrc) {
    return `<img class="${cls}" src="${escapeHtml(avatarSrc)}" alt="" />`;
  }
  return `<div class="${cls} probot-avatar-fallback" aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none">
        <circle cx="14" cy="20" r="3.4" fill="#fff"/>
        <circle cx="26" cy="20" r="3.4" fill="#fff" opacity="0.65"/>
      </svg>
    </div>`;
}

export function renderDialogInner(
  config: WidgetConfig,
  apiBase: string,
): string {
  const { bot, owner } = config;
  const displayName = owner.name ?? owner.username;
  const chatUrl = `${apiBase}/u/${encodeURIComponent(owner.username)}/chat`;
  const avatarSrc = bot.image ?? owner.image;
  const headerAvatarHtml = renderBotAvatar(avatarSrc, "header");
  const miniAvatarHtml = renderBotAvatar(avatarSrc, "mini");

  const hasSuggestions = bot.suggestedQuestions.length > 0;
  const suggestedChipsHtml = hasSuggestions
    ? `<div class="probot-suggested" data-role="suggestions">
         ${bot.suggestedQuestions
           .slice(0, 5)
           .map(
             (q) =>
               `<button type="button" class="probot-chip" data-action="ask" data-question="${escapeHtml(q)}">${escapeHtml(q)}</button>`,
           )
           .join("")}
       </div>`
    : "";

  const suggestedListHtml = hasSuggestions
    ? `<div class="probot-suggest-list" data-role="suggest-list" hidden>
         <p class="probot-suggest-list-heading">Suggested questions</p>
         <ul class="probot-suggest-list-items">
           ${bot.suggestedQuestions
             .map(
               (q) =>
                 `<li><button type="button" class="probot-suggest-list-item" data-action="ask" data-question="${escapeHtml(q)}">${escapeHtml(q)}</button></li>`,
             )
             .join("")}
         </ul>
       </div>`
    : "";

  const suggestedToggleHtml = hasSuggestions
    ? `<button type="button" class="probot-suggest-toggle" data-role="suggest-toggle" aria-label="Suggested questions" aria-expanded="false" hidden>
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <path d="M9 18h6"/>
           <path d="M10 22h4"/>
           <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5"/>
         </svg>
       </button>`
    : "";

  const subtitleHtml = bot.headline
    ? `<div class="probot-subtitle">${escapeHtml(bot.headline)}</div>`
    : `<div class="probot-subtitle probot-subtitle-online">Online now</div>`;

  return `
    <header class="probot-header">
      <div class="probot-avatar-wrap">
        ${headerAvatarHtml}
        <span class="probot-online-dot" aria-hidden="true"></span>
      </div>
      <div class="probot-titles">
        <div class="probot-title">
          ${escapeHtml(displayName)}
          <span class="probot-title-suffix">· AI Assistant</span>
        </div>
        ${subtitleHtml}
      </div>
      <button type="button" class="probot-close" aria-label="Close" data-action="close">×</button>
    </header>
    <div class="probot-body" data-role="body" data-avatar-src="${escapeHtml(avatarSrc ?? "")}">
      <div class="probot-messages" data-role="messages">
        <div class="probot-msg-row probot-msg-row-bot">
          ${miniAvatarHtml}
          <div class="probot-msg probot-msg-bot">Hi! I'm ${escapeHtml(bot.name)}, ${escapeHtml(displayName)}'s AI. Ask me anything.</div>
        </div>
      </div>
      ${suggestedChipsHtml}
    </div>
    ${suggestedListHtml}
    <form class="probot-inputbar" data-role="form" novalidate>
      ${suggestedToggleHtml}
      <input
        type="text"
        class="probot-input"
        data-role="input"
        placeholder="Ask anything about ${escapeHtml(bot.name)}…"
        autocomplete="off"
        maxlength="1000"
      />
      <button type="submit" class="probot-send" data-role="send" aria-label="Send">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 19V5"/>
          <path d="M5 12l7-7 7 7"/>
        </svg>
      </button>
    </form>
    <footer class="probot-footer">
      <a href="${escapeHtml(chatUrl)}" target="_blank" rel="noopener noreferrer">
        Open full chat ↗
      </a>
      <span class="probot-footer-sep">·</span>
      <a href="${escapeHtml(apiBase)}" target="_blank" rel="noopener noreferrer">
        Powered by ProBot
      </a>
    </footer>
  `;
}

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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function newUuid(): string {
  const c: Crypto | undefined =
    typeof crypto !== "undefined" ? crypto : undefined;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  if (!c || typeof c.getRandomValues !== "function") {
    throw new Error("no crypto namespace available");
  }
  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getOrCreateSessionId(botId: string): string {
  const key = `probot.session.${botId}`;
  try {
    const existing = window.localStorage.getItem(key);
    if (existing && UUID_RE.test(existing)) return existing;
    const created = newUuid();
    window.localStorage.setItem(key, created);
    return created;
  } catch {
    return newUuid();
  }
}

export async function mount(
  script: HTMLScriptElement | null,
  doc: Document = document,
): Promise<void> {
  const config = readScriptConfig(script);
  if (!config) return;

  const host = doc.createElement("div");
  host.setAttribute("data-probot-widget", "");
  doc.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "closed" });

  const style = doc.createElement("style");
  style.textContent = __WIDGET_CSS__;
  shadow.appendChild(style);

  shadow.addEventListener(
    "error",
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) return;
      const isHeader = target.classList.contains("probot-avatar");
      const isMini = target.classList.contains("probot-avatar-mini");
      if (!isHeader && !isMini) return;
      const wrapper = doc.createElement("div");
      wrapper.innerHTML = renderBotAvatar(null, isHeader ? "header" : "mini");
      const fallbackEl = wrapper.firstElementChild;
      if (fallbackEl) target.replaceWith(fallbackEl);
    },
    true,
  );

  const root = doc.createElement("div");
  root.className = "probot-root";
  root.style.setProperty("--probot-theme", FALLBACK_THEME);

  const bubble = doc.createElement("button");
  bubble.type = "button";
  bubble.className = "probot-bubble";
  bubble.setAttribute("aria-label", "Open chat");
  bubble.innerHTML = renderBubbleInner();

  const dialog = doc.createElement("div");
  dialog.className = "probot-dialog";
  dialog.hidden = true;
  dialog.innerHTML = renderFallbackDialogInner(config.apiBase);

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

  let raw: unknown;
  try {
    const res = await fetch(
      `${config.apiBase}/api/bots/${encodeURIComponent(config.botId)}/config`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return;
    raw = await res.json();
  } catch {
    return;
  }

  const widgetConfig = parseConfig(raw);
  if (!widgetConfig) return;

  root.style.setProperty("--probot-theme", widgetConfig.bot.themeColor);
  bubble.setAttribute("aria-label", `Open chat with ${widgetConfig.bot.name}`);
  dialog.innerHTML = renderDialogInner(widgetConfig, config.apiBase);

  wireChat(dialog, doc, config.apiBase, config.botId);
}

async function readErrorCode(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : null;
  } catch {
    return null;
  }
}

function messageForErrorCode(code: string | null): string {
  switch (code) {
    case "missing_llm_key":
      return "This bot isn't set up yet — its owner needs to save an AI key before it can answer.";
    case "managed_key_provider_mismatch":
      return "This bot's saved key doesn't match its selected AI provider. The owner needs to re-save it.";
    case "managed_storage_unavailable":
      return "The AI key service is temporarily unavailable. Please try again shortly.";
    case "provider_unavailable":
      return "This bot's AI provider isn't available right now. Try the full chat linked below.";
    default:
      return "I can't answer here right now. Try the full chat linked below.";
  }
}

function wireChat(
  dialog: HTMLElement,
  doc: Document,
  apiBase: string,
  botId: string,
): void {
  const form = dialog.querySelector<HTMLFormElement>('[data-role="form"]');
  const input = dialog.querySelector<HTMLInputElement>('[data-role="input"]');
  const messages = dialog.querySelector<HTMLElement>('[data-role="messages"]');
  const body = dialog.querySelector<HTMLElement>('[data-role="body"]');
  const suggestions = dialog.querySelector<HTMLElement>(
    '[data-role="suggestions"]',
  );
  const suggestList = dialog.querySelector<HTMLElement>(
    '[data-role="suggest-list"]',
  );
  const suggestToggle = dialog.querySelector<HTMLButtonElement>(
    '[data-role="suggest-toggle"]',
  );
  const sendBtn = dialog.querySelector<HTMLButtonElement>('[data-role="send"]');
  if (!form || !input || !messages || !sendBtn) return;

  function setSuggestListOpen(open: boolean): void {
    if (!suggestList || !suggestToggle) return;
    suggestList.hidden = !open;
    suggestToggle.setAttribute("aria-expanded", open ? "true" : "false");
    suggestToggle.classList.toggle("probot-suggest-toggle-active", open);
  }

  const sessionId = getOrCreateSessionId(botId);
  const avatarSrc = body?.dataset.avatarSrc || null;
  let inFlight = false;

  function scrollToEnd(): void {
    messages!.scrollTop = messages!.scrollHeight;
  }

  function appendMessage(role: "user" | "bot", text: string): HTMLElement {
    const row = doc.createElement("div");
    row.className = `probot-msg-row probot-msg-row-${role}`;
    if (role === "bot") {
      const wrapper = doc.createElement("div");
      wrapper.innerHTML = renderBotAvatar(avatarSrc, "mini");
      const avatarEl = wrapper.firstElementChild;
      if (avatarEl) row.appendChild(avatarEl);
    }
    const bubble = doc.createElement("div");
    bubble.className = `probot-msg probot-msg-${role}`;
    if (role === "bot") {
      bubble.innerHTML = renderMarkdown(text);
    } else {
      bubble.textContent = text;
    }
    row.appendChild(bubble);
    messages!.appendChild(row);
    scrollToEnd();
    return bubble;
  }

  function appendTyping(): HTMLElement {
    const row = doc.createElement("div");
    row.className = "probot-msg-row probot-msg-row-bot probot-typing-row";
    const wrapper = doc.createElement("div");
    wrapper.innerHTML = renderBotAvatar(avatarSrc, "mini");
    const avatarEl = wrapper.firstElementChild;
    if (avatarEl) row.appendChild(avatarEl);
    const bubble = doc.createElement("div");
    bubble.className = "probot-msg probot-msg-bot probot-typing";
    bubble.setAttribute("aria-label", "Assistant is typing");
    bubble.innerHTML = `<span></span><span></span><span></span>`;
    row.appendChild(bubble);
    messages!.appendChild(row);
    scrollToEnd();
    return row;
  }

  function setBusy(busy: boolean): void {
    inFlight = busy;
    input!.disabled = busy;
    sendBtn!.disabled = busy;
  }

  async function send(question: string): Promise<void> {
    const trimmed = question.trim();
    if (!trimmed || inFlight) return;

    if (suggestions) suggestions.hidden = true;
    if (suggestToggle) suggestToggle.hidden = false;
    setSuggestListOpen(false);

    appendMessage("user", trimmed);
    input!.value = "";
    setBusy(true);
    const typing = appendTyping();

    try {
      const res = await fetch(
        `${apiBase}/api/chat/${encodeURIComponent(botId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, sessionId }),
        },
      );

      typing.remove();

      if (res.status === 429) {
        appendMessage(
          "bot",
          "This bot is getting a lot of questions right now. Please try again in a minute.",
        );
        return;
      }
      if (!res.ok) {
        const code = await readErrorCode(res);
        appendMessage("bot", messageForErrorCode(code));
        return;
      }

      const data = (await res.json()) as { reply?: unknown };
      const reply =
        typeof data.reply === "string" && data.reply.length > 0
          ? data.reply
          : "I didn't get a reply. Please try again.";
      appendMessage("bot", reply);
    } catch {
      typing.remove();
      appendMessage(
        "bot",
        "Network hiccup - please check your connection and try again.",
      );
    } finally {
      setBusy(false);
      input!.focus();
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void send(input.value);
  });

  dialog.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const toggleEl = target.closest<HTMLElement>(
      '[data-role="suggest-toggle"]',
    );
    if (toggleEl) {
      setSuggestListOpen(suggestList?.hidden !== false ? true : false);
      return;
    }
    const askEl = target.closest<HTMLElement>('[data-action="ask"]');
    if (askEl) {
      const q = askEl.dataset.question ?? askEl.textContent ?? "";
      void send(q);
    }
  });
}

if (typeof document !== "undefined") {
  void mount(document.currentScript as HTMLScriptElement | null);
}
