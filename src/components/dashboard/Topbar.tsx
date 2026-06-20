"use client";

import { usePathname } from "next/navigation";

import { CopyUrlButton } from "@/components/dashboard/CopyUrlButton";
import { NotificationBell } from "@/components/dashboard/NotificationBell";

import { MobileSidebarToggle } from "./MobileSidebar";

type Props = {
  publicUrl: string | null;
  liveBotUrl: string | null;
};

// Sticky topbar — shared across all (dashboard) pages. Hosts the mobile
// hamburger button (left), page title (derived from pathname), public
// URL pill with copy button (when a bot is selected), and the
// notification bell + "View live bot" CTA on the right.
//
// NotificationBell relocated from the old single-row header in slice 6.4.
// Topbar is a client component so it can derive the page title from
// `usePathname()` without the server layout having to know which page
// is rendering.
export function Topbar({ publicUrl, liveBotUrl }: Props) {
  const pathname = usePathname() ?? "/dashboard";
  const title = deriveTitle(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-border-base bg-bg-app/85 backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-6 lg:px-8">
        <MobileSidebarToggle />
        <h1 className="font-display text-xl font-bold">{title}</h1>
        {publicUrl ? (
          <div className="ml-2 hidden items-center gap-1.5 rounded-lg border border-border-base bg-white px-2.5 py-1 font-mono text-xs text-muted md:flex">
            <span className="truncate">{stripScheme(publicUrl)}</span>
            <CopyUrlButton
              url={publicUrl}
              label="Copy"
              className="text-brand hover:text-brand-deep"
            />
          </div>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          {liveBotUrl ? (
            <a
              href={liveBotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary !py-2 hidden text-xs sm:inline-flex"
            >
              <svg
                aria-hidden
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              View live bot
            </a>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function deriveTitle(pathname: string): string {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname.endsWith("/conversations")) return "Conversations";
  if (pathname.endsWith("/leads")) return "Leads";
  if (pathname.endsWith("/settings")) return "Settings";
  if (pathname.endsWith("/new")) return "Bot Factory";
  if (pathname.includes("/conversations/")) return "Conversation";
  if (pathname.startsWith("/dashboard/bots/")) return "Bot";
  return "Dashboard";
}

function stripScheme(url: string): string {
  return url.replace(/^https?:\/\//, "");
}
