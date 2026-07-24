import Link from "next/link";

import { Icon } from "@/components/ui/Icon";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-16">
      <div className="il-stage flex max-w-lg flex-col items-center text-center">
        <ChatbotIllustration />

        <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-brand">
          Error 404
        </p>
        <h1 className="mt-2 font-display text-5xl font-extrabold tracking-tight text-ink lg:text-6xl">
          Oops!
        </h1>
        <p className="mt-4 text-center text-lg leading-relaxed text-muted">
          The page you are looking for does not exist. Please check the URL or
          return to the homepage.
        </p>

        <Link href="/" className="btn btn-primary mt-8 !px-7 !py-3.5 !text-base">
          <Icon name="home" className="!text-lg" />
          Return to homepage
        </Link>
      </div>
    </main>
  );
}

function ChatbotIllustration() {
  return (
    <svg
      viewBox="0 0 240 240"
      width="220"
      height="220"
      role="img"
      aria-label="A confused chatbot"
      className="max-w-full"
    >
      <circle className="il-ring" cx="120" cy="122" />
      <circle className="il-ring r2" cx="120" cy="122" />

      <ellipse
        className="il-orb-glow"
        cx="120"
        cy="120"
        rx="58"
        ry="54"
        fill="#bfdbfe"
      />

      <g className="il-float">
        <line
          x1="120"
          y1="66"
          x2="120"
          y2="50"
          stroke="#2563eb"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="120" cy="46" r="6" fill="#60a5fa" />

        <rect x="66" y="104" width="10" height="26" rx="5" fill="#1d4ed8" />
        <rect x="164" y="104" width="10" height="26" rx="5" fill="#1d4ed8" />

        <rect x="74" y="70" width="92" height="86" rx="26" fill="#2563eb" />

        <rect x="86" y="84" width="68" height="58" rx="20" fill="#eff6ff" />

        <g className="il-eyes">
          <circle cx="106" cy="108" r="7" fill="#2563eb" />
          <circle cx="134" cy="108" r="7" fill="#2563eb" />
        </g>

        <path
          d="M108 126 q12 -8 24 0"
          fill="none"
          stroke="#2563eb"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>

      <g className="il-float d1">
        <rect x="150" y="150" width="58" height="34" rx="14" fill="#2563eb" />
        <path d="M162 182 l-2 12 l14 -10 z" fill="#2563eb" />
        <circle className="il-dot" cx="166" cy="167" r="4" fill="#fff" />
        <circle className="il-dot b" cx="179" cy="167" r="4" fill="#fff" />
        <circle className="il-dot c" cx="192" cy="167" r="4" fill="#fff" />
      </g>
    </svg>
  );
}
