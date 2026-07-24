"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { CopyUrlButton } from "./CopyUrlButton";

type Props = {
  botId: string;
  username: string;
  themeColor: string;
  origin: string;
};

type TabId = "url" | "embed" | "npm" | "signature";

interface TabDef {
  id: TabId;
  label: string;
  description: string;
  snippet: string;
  render: ReactNode;
  copyLabel: string;
  link?: { href: string; label: string };
}

export function EmbedSnippet({ botId, username, themeColor, origin }: Props) {
  const [active, setActive] = useState<TabId>("url");

  const chatUrl = `${origin}/u/${username}/chat`;
  const scriptSrc = `${origin}/widget.js`;
  const embedSnippet = `<script
  src="${scriptSrc}"
  data-bot-id="${botId}"
></script>`;
  const signatureHtml = signatureBadgeHtml({ username, themeColor, origin });

  const tabs: TabDef[] = [
    {
      id: "url",
      label: "Public URL",
      description: "Direct link to your bot's chat page. Share anywhere.",
      snippet: chatUrl,
      render: <UrlTokens url={chatUrl} />,
      copyLabel: "Copy URL",
    },
    {
      id: "embed",
      label: "Website embed",
      description: "Paste this before the closing </body> tag on your site.",
      snippet: embedSnippet,
      render: <EmbedTokens scriptSrc={scriptSrc} botId={botId} />,
      copyLabel: "Copy embed",
    },
    {
      id: "npm",
      label: "npm package",
      description:
        "Prefer a bundler (Vite, webpack, Next.js)? Install the widget, then import it once and add a <script data-bot-id> tag.",
      snippet: "npm i probot-chatbot",
      render: <NpmTokens />,
      copyLabel: "Copy command",
      link: {
        href: "https://www.npmjs.com/package/probot-chatbot",
        label: "View on npm",
      },
    },
    {
      id: "signature",
      label: "Email signature",
      description:
        "Paste the HTML into your Gmail / Apple Mail signature settings.",
      snippet: signatureHtml,
      render: (
        <SignatureTokens
          username={username}
          themeColor={themeColor}
          origin={origin}
        />
      ),
      copyLabel: "Copy signature",
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border-base bg-white">
      <div
        role="tablist"
        aria-label="Share options"
        className="flex border-b border-border-base px-3 pt-3"
      >
        {tabs.map((t) => {
          const selected = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`embed-panel-${t.id}`}
              id={`embed-tab-${t.id}`}
              onClick={() => setActive(t.id)}
              className={`-mb-px flex-1 truncate rounded-t-lg border-b-2 px-2 py-2 text-center text-xs font-semibold transition-colors ${
                selected
                  ? "border-brand text-brand"
                  : "border-transparent text-muted hover:text-ink"
              }`}
              title={t.label}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tabs.map((t) => (
        <SnippetPanel
          key={t.id}
          tabId={t.id}
          hidden={active !== t.id}
          description={t.description}
          snippet={t.snippet}
          render={t.render}
          copyLabel={t.copyLabel}
          link={t.link}
        />
      ))}
    </div>
  );
}

function SnippetPanel({
  tabId,
  hidden,
  description,
  snippet,
  render,
  copyLabel,
  link,
}: {
  tabId: TabId;
  hidden: boolean;
  description: string;
  snippet: string;
  render: ReactNode;
  copyLabel: string;
  link?: { href: string; label: string };
}) {
  return (
    <div
      role="tabpanel"
      id={`embed-panel-${tabId}`}
      aria-labelledby={`embed-tab-${tabId}`}
      hidden={hidden}
      className="p-5"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-xs text-muted">{description}</p>
        <CopyUrlButton
          url={snippet}
          label={copyLabel}
          iconOnly
          className="shrink-0 p-1 text-muted transition-colors hover:text-ink"
        />
      </div>
      <pre className="overflow-x-auto rounded-xl bg-neutral-900 px-3.5 py-3 font-mono text-xs leading-relaxed text-neutral-100 ring-1 ring-white/10">
        <code>{render}</code>
      </pre>
      {link ? (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-xs font-semibold text-brand hover:underline"
        >
          {link.label}
        </a>
      ) : null}
    </div>
  );
}

function UrlTokens({ url }: { url: string }) {
  const m = url.match(/^(https?:\/\/)([^/]+)(\/.*)?$/);
  if (!m) return <span className="text-neutral-100">{url}</span>;
  const [, scheme, host, path] = m;
  return (
    <>
      <span className="text-neutral-500">{scheme}</span>
      <span className="text-sky-300">{host}</span>
      {path ? <span className="text-emerald-300">{path}</span> : null}
    </>
  );
}

function EmbedTokens({
  scriptSrc,
  botId,
}: {
  scriptSrc: string;
  botId: string;
}) {
  return (
    <>
      <span className="text-rose-300">{"<script"}</span>
      {"\n  "}
      <span className="text-sky-300">src</span>
      <span className="text-neutral-500">=</span>
      <span className="text-emerald-300">{`"${scriptSrc}"`}</span>
      {"\n  "}
      <span className="text-sky-300">data-bot-id</span>
      <span className="text-neutral-500">=</span>
      <span className="text-emerald-300">{`"${botId}"`}</span>
      {"\n"}
      <span className="text-rose-300">{"></script>"}</span>
    </>
  );
}

function NpmTokens() {
  return (
    <>
      <span className="text-rose-300">npm</span>{" "}
      <span className="text-sky-300">i</span>{" "}
      <span className="text-emerald-300">probot-chatbot</span>
    </>
  );
}

function SignatureTokens({
  username,
  themeColor,
  origin,
}: {
  username: string;
  themeColor: string;
  origin: string;
}) {
  const url = `${origin}/u/${username}/chat`;
  const label = `💬 Chat with my AI · ${origin.replace(/^https?:\/\//, "")}/u/${username}`;
  const stylePairs: Array<[string, string]> = [
    ["display", "inline-flex"],
    ["align-items", "center"],
    ["gap", "6px"],
    ["color", themeColor],
    ["text-decoration", "none"],
    ["font-weight", "600"],
    ["font-family", "Arial,sans-serif"],
    ["font-size", "13px"],
  ];
  return (
    <>
      <span className="text-rose-300">{"<a"}</span>
      {"\n  "}
      <span className="text-sky-300">href</span>
      <span className="text-neutral-500">=</span>
      <span className="text-emerald-300">{`"${url}"`}</span>
      {"\n  "}
      <span className="text-sky-300">target</span>
      <span className="text-neutral-500">=</span>
      <span className="text-emerald-300">{`"_blank"`}</span>
      {"\n  "}
      <span className="text-sky-300">rel</span>
      <span className="text-neutral-500">=</span>
      <span className="text-emerald-300">{`"noopener noreferrer"`}</span>
      {"\n  "}
      <span className="text-sky-300">style</span>
      <span className="text-neutral-500">=</span>
      <span className="text-emerald-300">{'"'}</span>
      {stylePairs.map(([prop, value], i) => (
        <span key={prop}>
          {"\n    "}
          <span className="text-sky-300">{prop}</span>
          <span className="text-neutral-500">: </span>
          <span className="text-emerald-300">{value}</span>
          <span className="text-neutral-500">;</span>
          {i === stylePairs.length - 1 ? "" : ""}
        </span>
      ))}
      {"\n  "}
      <span className="text-emerald-300">{'"'}</span>
      {"\n"}
      <span className="text-rose-300">{">"}</span>
      {"\n  "}
      <span className="text-neutral-100">{label}</span>
      {"\n"}
      <span className="text-rose-300">{"</a>"}</span>
    </>
  );
}

export function signatureBadgeHtml(args: {
  username: string;
  themeColor: string;
  origin: string;
}): string {
  const { username, themeColor, origin } = args;
  const url = `${origin}/u/${username}/chat`;
  return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;color:${themeColor};text-decoration:none;font-weight:600;font-family:Arial,sans-serif;font-size:13px;">💬 Chat with my AI · ${origin.replace(/^https?:\/\//, "")}/u/${username}</a>`;
}
