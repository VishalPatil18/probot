import Link from "next/link";

const DOCS_URL = "https://pro-bot-ai.vercel.app/docs";
const CHANGELOG_URL = "https://pro-bot-ai.vercel.app/docs/changelog";
const GITHUB_URL = "https://github.com/VishalPatil18";
const LINKEDIN_URL = "https://www.linkedin.com/in/vishalrameshpatil/";
const PORTFOLIO_URL = "https://vishalpatil.vercel.app/";

function MaterialIcon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <span className={`material-symbols-outlined ${className}`} aria-hidden>
      {name}
    </span>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border-base bg-white">
      <div className="mx-auto max-w-[1180px] px-6 pt-14 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
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
              Your AI digital recruiter. Available 24/7.
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
                <Link href="/#free-to-use" className="hover:text-ink">
                  Free to Use
                </Link>
              </li>
              <li>
                <Link href="/u/vishal/chat" className="hover:text-ink">
                  Live demo
                </Link>
              </li>
              <li>
                <Link href="/dashboard/bots/new" className="hover:text-ink">
                  Create a bot
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
                  href={DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ink"
                >
                  Models &amp; API keys
                </a>
              </li>
              <li>
                <a
                  href={DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ink"
                >
                  Embed widget
                </a>
              </li>
              <li>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ink"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold mb-3">Account</p>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link href="/login" className="hover:text-ink">
                  Log in
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-ink">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-ink">
                  Settings
                </Link>
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
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-ink"
            >
              <MaterialIcon name="code" className="!text-base" />
              GitHub
            </a>
            <a
              href={PORTFOLIO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-ink"
            >
              <MaterialIcon name="public" className="!text-base" />
              Portfolio
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-ink"
            >
              <MaterialIcon name="badge" className="!text-base" />
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
