import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Roadmap · ProBot",
  description:
    "What's shipped and what's next for ProBot v1.0 - from branding and auth UX through account hardening, the Bot Factory, marketing pages, performance, and the self-hosted bot runtime.",
};

const DISCUSSIONS_URL = "https://github.com/vishalpatil18/probot/discussions";

// Hand-maintained mirror of claude/plan-v1.md. Update the `status` of a stage
// when it ships so the public roadmap stays honest without coupling a marketing
// page to an internal planning doc's markdown format.
type Status = "shipped" | "in-progress" | "planned";

type Stage = {
  n: number;
  title: string;
  status: Status;
  blurb: string;
};

const STAGES: Stage[] = [
  {
    n: 1,
    title: "Branding & Copy Cleanup",
    status: "shipped",
    blurb: "Consistent naming, domain, and product copy across the app.",
  },
  {
    n: 2,
    title: "Auth UX & Bug-fix Sprint",
    status: "shipped",
    blurb:
      "Show-password, remember-me, signup availability check, forgot-password modal, magic-link.",
  },
  {
    n: 3,
    title: "Account & Settings Hardening",
    status: "shipped",
    blurb:
      "Editable profile, password change, profile photo upload, redesigned theme picker.",
  },
  {
    n: 4,
    title: "Bot Factory & Dashboard Polish",
    status: "shipped",
    blurb:
      "Bot avatars, per-file PDF error handling, theme-in-wizard, dark embed snippets.",
  },
  {
    n: 5,
    title: "Sidebar, Notifications & Empty-State Polish",
    status: "shipped",
    blurb:
      "Clean empty-state sidebar, account settings without a bot, lead-email opt-in, ToS banner.",
  },
  {
    n: 6,
    title: "Marketing & Trust Pages",
    status: "in-progress",
    blurb:
      "Why ProBot comparison, this roadmap, a hire-me page, and a landing demo video.",
  },
  {
    n: 7,
    title: "SEO, Docs & Discoverability",
    status: "planned",
    blurb:
      "Sitemaps, structured data, OG images, and reorganised documentation.",
  },
  {
    n: 8,
    title: "Performance, Scale & Operational Polish",
    status: "planned",
    blurb:
      "Performance budgets, Redis-backed rate limits + circuit breaker, alerting.",
  },
  {
    n: 9,
    title: "Self-Hosted Bot Repo Architecture",
    status: "planned",
    blurb:
      "A tiny bot runtime you deploy yourself that talks to the ProBot platform API.",
  },
];

const STATUS_META: Record<Status, { label: string; className: string }> = {
  shipped: {
    label: "Shipped",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  "in-progress": {
    label: "In progress",
    className: "border-blue-200 bg-blue-50 text-brand",
  },
  planned: {
    label: "Planned",
    className: "border-border-base bg-neutral-50 text-muted",
  },
};

export default function RoadmapPage() {
  return (
    <section className="dot-pattern border-b border-border-base">
      <div className="mx-auto max-w-[860px] px-6 py-16 lg:py-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-brand">
          <span className="size-1.5 rounded-full bg-brand" /> Version 1.0
        </span>
        <h1 className="font-display mt-5 text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05]">
          Roadmap
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          ProBot ships in small, verifiable stages - each one independently
          deployable. Here&apos;s what&apos;s done and what&apos;s next.
        </p>

        <ol className="mt-12 space-y-4">
          {STAGES.map((stage) => {
            const meta = STATUS_META[stage.status];
            return (
              <li
                key={stage.n}
                className="flex gap-4 rounded-2xl border border-border-base bg-white p-5 shadow-soft"
              >
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-neutral-100 text-sm font-bold">
                  {stage.n}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-bold">{stage.title}</h2>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{stage.blurb}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-12 rounded-2xl border border-border-base bg-white p-6 text-center shadow-soft">
          <p className="font-bold">Have an idea?</p>
          <p className="mt-1 text-sm text-muted">
            ProBot is open source and built in the open. Suggest a feature or
            vote on what&apos;s next.
          </p>
          <a
            href={DISCUSSIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary mt-4 !px-6 !py-3 !text-base"
          >
            Suggest a feature
          </a>
        </div>
      </div>
    </section>
  );
}
