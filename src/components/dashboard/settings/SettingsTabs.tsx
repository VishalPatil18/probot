"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";

export type SettingsTabKey =
  | "account"
  | "bot"
  | "kb"
  | "security"
  | "model";

type Tab = {
  key: SettingsTabKey;
  label: string;
};

const TABS: Tab[] = [
  { key: "account", label: "Account" },
  { key: "bot", label: "Bot configuration" },
  { key: "kb", label: "Knowledge base" },
  { key: "security", label: "Security & privacy" },
  { key: "model", label: "AI model & API key" },
];

const DEFAULT_TAB: SettingsTabKey = "account";

const SettingsTabsContext = createContext<{ active: SettingsTabKey } | null>(
  null,
);

function panelId(tab: SettingsTabKey): string {
  return `settings-tabpanel-${tab}`;
}

function tabId(tab: SettingsTabKey): string {
  return `settings-tab-${tab}`;
}

type Props = {
  children: ReactNode;
};

// Slice B settings page tab strip. Tab state lives in the URL via
// `?tab=` so deep links + browser back work without extra JS plumbing.
// Click flips the param via `router.replace` (not `push`) so back
// doesn't fill with tab-changes the user didn't really commit to.
//
// `children` is an array of <SettingsTabPanel> elements; only the panel
// matching the active key renders. Tab buttons + panels are wired with
// ARIA `aria-controls` / `aria-labelledby` per the WAI-ARIA tabs
// pattern so screen readers announce the relationship.
export function SettingsTabs({ children }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requested = searchParams.get("tab") ?? "";
  const active: SettingsTabKey = TABS.some((t) => t.key === requested)
    ? (requested as SettingsTabKey)
    : DEFAULT_TAB;

  function setActive(next: SettingsTabKey) {
    if (next === active) return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next === DEFAULT_TAB) params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(qs.length > 0 ? `?${qs}` : "?", { scroll: false });
  }

  return (
    <SettingsTabsContext.Provider value={{ active }}>
      <div
        role="tablist"
        aria-label="Settings tabs"
        className="thin-scroll mb-8 flex gap-1 overflow-x-auto border-b border-border-base"
      >
        {TABS.map((tab) => {
          const on = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={tabId(tab.key)}
              aria-selected={on}
              aria-controls={panelId(tab.key)}
              onClick={() => setActive(tab.key)}
              className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                on
                  ? "border-brand text-brand"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {children}
    </SettingsTabsContext.Provider>
  );
}

export function SettingsTabPanel({
  tab,
  children,
}: {
  tab: SettingsTabKey;
  children: ReactNode;
}) {
  const ctx = useContext(SettingsTabsContext);
  if (!ctx) {
    throw new Error("<SettingsTabPanel> must be inside <SettingsTabs>");
  }
  if (ctx.active !== tab) return null;
  return (
    <div role="tabpanel" id={panelId(tab)} aria-labelledby={tabId(tab)}>
      {children}
    </div>
  );
}
