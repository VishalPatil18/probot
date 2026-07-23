import Link from "next/link";

export function BrandPanel() {
  return (
    <div className="hidden lg:flex brand-deep-gradient dot-pattern-light flex-col justify-between p-12 text-white relative overflow-hidden">
      <Link
        href="/"
        className="flex items-center gap-2.5 relative z-10"
        aria-label="ProBot home"
      >
        <ProBotLogo size={30} />
        <span className="font-display text-xl font-extrabold tracking-tight">
          ProBot
        </span>
      </Link>

      <div className="relative z-10 max-w-md mx-auto">
        <h2 className="font-display text-4xl font-extrabold tracking-tight leading-[1.08] mb-6">
          Your career, answering questions while you sleep.
        </h2>
        <p className="text-white/50 text-sm leading-relaxed mb-6 -mt-3">
          Free &amp; open source · four LLM providers · keys encrypted, never
          tracked.
        </p>
        <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-3 pb-3 border-b border-white/10 mb-3">
            <div className="size-9 rounded-full bg-white/10 grid place-items-center">
              <BotIcon />
            </div>
            <div>
              <p className="text-sm font-bold">Jane&apos;s AI Assistant</p>
              <p className="text-[11px] text-white/50">
                ● answered 47 recruiters this week
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="bg-white/10 rounded-xl rounded-bl-sm px-3 py-2 text-xs w-fit max-w-[80%]">
              Does she know Kubernetes?
            </div>
            <div className="bg-white rounded-xl rounded-br-sm px-3 py-2 text-xs w-fit max-w-[85%] ml-auto text-ink">
              Yes - she ran production K8s clusters at her last role for 2
              years.
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-6 text-sm text-white/50">
        <span className="flex items-center gap-1.5">
          <CodeIcon /> Free &amp; open source
        </span>
        <span className="flex items-center gap-1.5">
          <KeyIcon /> 4 providers, BYO key
        </span>
        <span className="flex items-center gap-1.5">
          <LockIcon /> Encrypted · no telemetry
        </span>
      </div>
    </div>
  );
}

function ProBotLogo({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="16" fill="oklch(0.62 0.17 248)" />
      <circle cx="14" cy="20" r="3.4" fill="#fff" />
      <circle cx="26" cy="20" r="3.4" fill="#fff" opacity="0.65" />
    </svg>
  );
}

function BotIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <circle cx="8.5" cy="16" r="1" />
      <circle cx="15.5" cy="16" r="1" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="15" r="4" />
      <path d="M10.85 12.15 19 4" />
      <path d="M18 5l3 3" />
      <path d="M15 8l2 2" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
