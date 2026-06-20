"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SidebarIcon } from "./Sidebar";

type Props = {
  href: string;
  icon: string;
  label: string;
  rightBadge?: string | null;
  badgeTone?: "muted" | "brand";
  external?: boolean;
};

// Active state is computed client-side via `usePathname()` so the
// server layout doesn't have to thread the current path through every
// nav row. Exact-match for `/dashboard` (so deep links into bot pages
// don't double-highlight the home row); prefix-match for everything else.
function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

export function SidebarNavLink({
  href,
  icon,
  label,
  rightBadge,
  badgeTone = "muted",
  external = false,
}: Props) {
  const pathname = usePathname() ?? "";
  const active = !external && isActive(pathname, href);
  const baseClasses =
    "flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-sm transition-colors";
  const stateClasses = active
    ? "bg-blue-50 text-brand font-semibold"
    : "text-muted hover:bg-neutral-50 hover:text-ink";

  const inner = (
    <>
      <SidebarIcon name={icon} />
      <span className="flex-1">{label}</span>
      {rightBadge ? (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
            badgeTone === "brand"
              ? "bg-brand text-white"
              : "bg-neutral-100 text-ink"
          }`}
        >
          {rightBadge}
        </span>
      ) : null}
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${baseClasses} ${stateClasses}`}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={`${baseClasses} ${stateClasses}`}>
      {inner}
    </Link>
  );
}
