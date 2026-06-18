// OAuth buttons - rendered disabled with a "SOON" badge per Q1=b.
// Real wiring lands in Stage 7 (per claude/plan.md §7.5).
export function OAuthDisabledRow() {
  const baseClass =
    "flex items-center justify-center gap-2 h-11 rounded-xl border border-border-base bg-white text-sm font-semibold opacity-60 cursor-not-allowed relative";

  return (
    <div
      className="space-y-2.5 mb-6"
      aria-label="OAuth providers - coming in Stage 7"
    >
      <button
        type="button"
        disabled
        title="OAuth sign-in arrives in Stage 7"
        className={baseClass + " w-full"}
      >
        <GoogleLogo />
        Continue with Google
        <SoonBadge />
      </button>
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          disabled
          title="OAuth sign-in arrives in Stage 7"
          className={baseClass}
        >
          <GitHubLogo />
          GitHub
          <SoonBadge />
        </button>
        <button
          type="button"
          disabled
          title="OAuth sign-in arrives in Stage 7"
          className={baseClass}
        >
          <span className="text-[#0a66c2] font-bold text-base">in</span>
          LinkedIn
          <SoonBadge />
        </button>
      </div>
    </div>
  );
}

function SoonBadge() {
  return (
    <span className="absolute -top-2 -right-2 text-[9px] font-bold bg-muted text-white rounded-full px-1.5 py-0.5 tracking-wide">
      SOON
    </span>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 16.3 4.5 9.7 8.8 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 43.5c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 34.5 26.7 35.5 24 35.5c-5.3 0-9.7-2.6-11.3-7l-6.5 5C9.6 39.1 16.2 43.5 24 43.5z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3c-.4.4 6.9-5 6.9-14.8 0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

function GitHubLogo() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18.91-.25 1.89-.38 2.87-.39.97.01 1.95.14 2.87.39 2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.73.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.07.78 2.16v3.2c0 .3.21.66.79.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}
