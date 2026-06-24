import Link from "next/link";

import { Icon } from "@/components/ui/Icon";

const DOCS_URL = "https://pro-bot.dev/docs";
const MODELS_URL = "https://pro-bot.dev/docs/guides/models-and-keys";
const EMBED_URL = "https://pro-bot.dev/docs/embed-share";
const CHANGELOG_URL = "https://pro-bot.dev/docs/release-notes/beta";

export function SiteFooter() {
  return (
    <footer className="border-t border-border-base bg-white">
      <div className="mx-auto max-w-[1180px] px-6 pt-14 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-3">
              <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="oklch(0.55 0.193 251.78)"
                />
                <circle cx="14" cy="20" r="3.4" fill="#fff" />
                <circle cx="26" cy="20" r="3.4" fill="#fff" opacity="0.65" />
              </svg>
              <span className="font-display text-lg font-extrabold tracking-tight">
                ProBot
              </span>
            </Link>
            <p className="text-xs text-muted leading-relaxed">
              Your AI Representative. Available 24/7.
              <br />
              Free &amp; open source (MIT).
            </p>
          </div>
          <div>
            <p className="text-sm font-bold mb-3">Product</p>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link href="/#features" className="hover:text-ink">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/why-pro-bot" className="hover:text-ink">
                  Why ProBot
                </Link>
              </li>
              <li>
                <a
                  href={CHANGELOG_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ink"
                >
                  Changelog
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold mb-3">Developers</p>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <a
                  href={DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ink"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href={MODELS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ink"
                >
                  Models &amp; API keys
                </a>
              </li>
              <li>
                <a
                  href={EMBED_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ink"
                >
                  Embed widget
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold mb-3">Company</p>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link href="/about" className="hover:text-ink">
                  About
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-ink">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-ink">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-border-base flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted">
            © 2026 ProBot · Free to use, MIT licensed. Built on the VAi engine.
          </p>
          <div className="flex gap-4 text-muted text-sm">
            <Link href="/hire-me" className="hover:text-ink">
              Hire the developer (Vishal Patil)
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
