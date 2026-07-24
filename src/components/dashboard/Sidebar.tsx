import Link from "next/link";

import { BotSwitcher } from "./BotSwitcher";
import { ComingSoonPill } from "./ComingSoonPill";
import { SidebarAccountFooter } from "./SidebarAccountFooter";
import { SidebarNavLink } from "./SidebarNavLink";

type SidebarBot = {
  id: string;
  name: string;
  deploymentMode?: "managed" | "self_hosted";
};

type SidebarUser = {
  name: string;
  email: string;
  initials: string;
};

type SidebarCounts = {
  conversations: number;
  leads: number;
};

type Props = {
  bots: SidebarBot[];
  selectedBotId: string | null;
  selectedBotName: string;
  publicUrl: string;
  counts: SidebarCounts;
  user: SidebarUser;
  llmProvider: string | null;
  llmModel: string | null;
};

const EMBED_GUIDE_URL = "https://pro-bot.dev/docs/embed-share";

export function Sidebar({
  bots,
  selectedBotId,
  selectedBotName,
  publicUrl,
  counts,
  user,
  llmProvider,
  llmModel,
}: Props) {
  const hasBots = bots.length > 0;
  const selectedBot = bots.find((b) => b.id === selectedBotId) ?? null;
  const showBotConfigLink = selectedBotId !== null;
  const settingsHref = selectedBotId
    ? `/dashboard/bots/${selectedBotId}/settings`
    : "/dashboard/settings";
  const modelHref =
    selectedBotId && selectedBot?.deploymentMode !== "self_hosted"
      ? `/dashboard/bots/${selectedBotId}/configuration?tab=model`
      : "/dashboard/settings";
  return (
    <aside className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-border-base px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2 py-1">
          <svg
            aria-hidden
            width="28"
            height="28"
            viewBox="0 0 40 40"
            fill="none"
          >
            <circle cx="20" cy="20" r="16" fill="oklch(0.55 0.193 251.78)" />
            <circle cx="14" cy="20" r="3.4" fill="#fff" />
            <circle cx="26" cy="20" r="3.4" fill="#fff" opacity="0.65" />
          </svg>
          <span className="font-display text-lg font-extrabold tracking-tight">
            ProBot
          </span>
        </Link>
      </div>

      {selectedBotId ? (
        <div className="px-4 py-4">
          <BotSwitcher
            bots={bots}
            selectedBotId={selectedBotId}
            selectedBotName={selectedBotName}
            publicUrl={publicUrl}
          />
        </div>
      ) : null}

      <nav className="thin-scroll flex-1 space-y-1 overflow-y-auto px-3">
        {hasBots ? (
          <>
            <SidebarSection title="Workspace" />
            <SidebarNavLink
              href="/dashboard"
              icon="dashboard"
              label="Dashboard"
            />
            <SidebarNavLink
              href={`/dashboard/bots/${selectedBotId}/conversations`}
              icon="forum"
              label="Conversations"
              rightBadge={
                counts.conversations > 0
                  ? formatCount(counts.conversations)
                  : null
              }
            />
            <SidebarNavLink
              href={`/dashboard/bots/${selectedBotId}/leads`}
              icon="contact_mail"
              label="Leads"
              rightBadge={counts.leads > 0 ? formatCount(counts.leads) : null}
              badgeTone={counts.leads > 0 ? "brand" : "muted"}
            />
            <SidebarNavLink
              href="/dashboard/notifications"
              icon="bell"
              label="Notifications"
            />
          </>
        ) : null}

        <SidebarSection title="Build" />
        <SidebarNavLink
          href="/dashboard/bots/new"
          icon="build"
          label={hasBots ? "Bot Factory" : "Create bot"}
        />
        {showBotConfigLink ? (
          <SidebarNavLink
            href={`/dashboard/bots/${selectedBotId}/configuration`}
            icon="tune"
            label="Bot Configuration"
          />
        ) : null}

        <SidebarSection title="Account" />
        <SidebarNavLink href={settingsHref} icon="settings" label="Settings" />
      </nav>

      <SidebarAccountFooter
        llmProvider={llmProvider}
        llmModel={llmModel}
        user={user}
        settingsHref={settingsHref}
        modelHref={modelHref}
      />
    </aside>
  );
}

function SidebarSection({ title }: { title: string }) {
  return (
    <p className="mb-1 mt-4 px-3 text-[10px] font-bold uppercase tracking-widest text-muted first:mt-1">
      {title}
    </p>
  );
}

function SidebarNavDisabled({ icon, label }: { icon: string; label: string }) {
  return (
    <div
      aria-disabled
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted opacity-60"
    >
      <SidebarIcon name={icon} />
      <span className="flex-1">{label}</span>
      <ComingSoonPill />
    </div>
  );
}

function SidebarIcon({ name }: { name: string }) {
  const paths: Record<string, JSX.Element> = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </>
    ),
    forum: (
      <>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </>
    ),
    contact_mail: (
      <>
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </>
    ),
    build: (
      <>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </>
    ),
    code: (
      <>
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>
    ),
    hub: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    ),
    tune: (
      <>
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] ?? null}
    </svg>
  );
}

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(1)}k`;
}

export { SidebarIcon };
