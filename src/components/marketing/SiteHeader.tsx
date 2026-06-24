"use client";

import Link from "next/link";
import { useState } from "react";

import { Icon } from "@/components/ui/Icon";

const DOCS_URL = "https://pro-bot.dev/docs";

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-bg-app/85 backdrop-blur-md border-b border-border-base">
      <div className="mx-auto max-w-[1180px] h-16 px-6 flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <svg width="30" height="30" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="16" fill="oklch(0.55 0.193 251.78)" />
            <circle cx="20" cy="20" r="16" fill="url(#nav-orb)" />
            <circle cx="14" cy="20" r="3.4" fill="#fff" />
            <circle cx="26" cy="20" r="3.4" fill="#fff" opacity="0.65" />
            <defs>
              <radialGradient id="nav-orb" cx="0.35" cy="0.3" r="0.8">
                <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>
          <span className="font-display text-xl font-extrabold tracking-tight">
            ProBot
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <Link
            href="/#how"
            className="px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            How it works
          </Link>
          <Link
            href="/#features"
            className="px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            Features
          </Link>
          <Link
            href="/why-pro-bot"
            className="px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            Why ProBot
          </Link>
          <Link
            href="/about"
            className="px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            About
          </Link>
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            Docs
          </a>
        </nav>
        <div className="hidden md:flex items-center gap-2 ml-auto">
          <Link href="/login" className="btn btn-secondary">
            Log in
          </Link>
          <Link href="/dashboard/bots/new" className="btn btn-primary">
            Create your bot
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation"
          className="md:hidden ml-auto size-9 grid place-items-center rounded-lg border border-border-base"
        >
          <Icon name="menu" className="!text-xl" />
        </button>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-border-base bg-bg-app px-6 py-4 flex flex-col gap-1">
          <Link href="/#how" className="py-2 font-medium">
            How it works
          </Link>
          <Link href="/#features" className="py-2 font-medium">
            Features
          </Link>
          <Link href="/why-pro-bot" className="py-2 font-medium">
            Why ProBot
          </Link>
          <Link href="/about" className="py-2 font-medium">
            About
          </Link>
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 font-medium"
          >
            Docs
          </a>
          <Link href="/u/vishal/chat" className="py-2 font-medium">
            Live demo
          </Link>
          <div className="flex gap-2 mt-3">
            <Link href="/login" className="btn btn-secondary flex-1">
              Log in
            </Link>
            <Link href="/dashboard/bots/new" className="btn btn-primary flex-1">
              Create bot
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
