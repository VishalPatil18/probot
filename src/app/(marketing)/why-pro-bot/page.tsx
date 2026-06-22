import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Why ProBot · ProBot",
  description:
    "How ProBot compares to generic chatbot platforms: bring your own LLM key, free and open source, self-hostable, and GDPR-ready by default.",
};

// Honest, defensible comparison. Each row is a property a job-seeker actually
// cares about; the "generic platform" column reflects the common default of
// closed SaaS chatbot builders (hosted-only, their key, paid tiers, closed
// source). Kept factual - no named competitors, no unverifiable claims.
type Row = {
  feature: string;
  detail: string;
  probot: boolean;
  generic: boolean;
};

const ROWS: Row[] = [
  {
    feature: "Bring your own LLM key",
    detail: "Use your own Claude / OpenAI / Gemini / Azure key - no markup.",
    probot: true,
    generic: false,
  },
  {
    feature: "Free to use",
    detail: "No subscription. You only pay your own LLM provider, if anything.",
    probot: true,
    generic: false,
  },
  {
    feature: "Open source (MIT)",
    detail: "Read every line, fork it, audit the security yourself.",
    probot: true,
    generic: false,
  },
  {
    feature: "Self-hostable",
    detail: "Run the whole thing on your own infrastructure if you want.",
    probot: true,
    generic: false,
  },
  {
    feature: "Keys never logged",
    detail:
      "Your key lives in your browser, or envelope-encrypted if you opt in.",
    probot: true,
    generic: false,
  },
  {
    feature: "GDPR data export + deletion",
    detail: "Export everything, delete your account with a 7-day grace window.",
    probot: true,
    generic: false,
  },
  {
    feature: "No telemetry / no ad tracking",
    detail: "We don't sell data or run ads against your conversations.",
    probot: true,
    generic: false,
  },
  {
    feature: "Embeddable widget",
    detail: "Drop a one-line script onto your portfolio.",
    probot: true,
    generic: true,
  },
];

export default function WhyProBotPage() {
  return (
    <section className="dot-pattern border-b border-border-base">
      <div className="mx-auto max-w-[1000px] px-6 py-16 lg:py-24">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-brand">
            <span className="size-1.5 rounded-full bg-brand" /> Honest
            comparison
          </span>
          <h1 className="font-display mt-5 text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05]">
            Why ProBot, not another chatbot platform?
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            Most chatbot builders are closed, hosted-only SaaS: their model,
            their key, their pricing, your data on their servers. ProBot is the
            opposite - your key, your data, free and open source.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-border-base bg-white shadow-soft">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-base bg-neutral-50">
                <th className="px-5 py-4 font-semibold">What matters</th>
                <th className="px-4 py-4 text-center font-semibold text-brand">
                  ProBot
                </th>
                <th className="px-4 py-4 text-center font-semibold text-muted">
                  Generic platform
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr
                  key={row.feature}
                  className="border-b border-border-base last:border-b-0 align-top"
                >
                  <td className="px-5 py-4">
                    <p className="font-semibold text-ink">{row.feature}</p>
                    <p className="mt-0.5 text-xs text-muted">{row.detail}</p>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Mark on={row.probot} />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Mark on={row.generic} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/bots/new"
            className="btn btn-primary !px-6 !py-3 !text-base"
          >
            Create your bot in 2 min
          </Link>
          <Link
            href="/about"
            className="btn btn-secondary !px-6 !py-3 !text-base"
          >
            How the trust model works
          </Link>
        </div>
        <p className="mt-6 text-xs text-muted">
          &ldquo;Generic platform&rdquo; reflects the common default of
          closed-source, hosted-only chatbot builders. Your mileage with any
          specific product may vary - the point is what ProBot guarantees by
          design.
        </p>
      </div>
    </section>
  );
}

function Mark({ on }: { on: boolean }) {
  if (on) {
    return (
      <span
        className="inline-grid size-7 place-items-center rounded-full bg-emerald-50 text-emerald-600"
        aria-label="Yes"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className="inline-grid size-7 place-items-center rounded-full bg-rose-50 text-rose-500"
      aria-label="No"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </span>
  );
}
