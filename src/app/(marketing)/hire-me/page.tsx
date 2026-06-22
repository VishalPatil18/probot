import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hire Vishal Patil · ProBot",
  description:
    "Vishal Patil built ProBot. Spec-Driven Development, full-stack + AI engineering, open to roles across the US and Europe.",
};

const PORTFOLIO_URL = "https://vishalpatil.vercel.app/";
const GITHUB_URL = "https://github.com/VishalPatil18";
const LINKEDIN_URL = "https://www.linkedin.com/in/vishalrameshpatil/";
const EMAIL = "vishalpatil.imp@gmail.com";
// Set this to the CNBC article URL once available; until then the mention
// renders as plain text (no link) so we never ship a broken/placeholder link.
const CNBC_ARTICLE_URL = "#";

const SKILLS = [
  "Spec-Driven Development",
  "Full-stack (Next.js · TypeScript)",
  "RAG & GenAI integrations",
  "Multi-provider LLM systems",
  "Security & GDPR-by-design",
  "Postgres · Drizzle ORM",
];

export default function HireMePage() {
  const hasCnbcLink = CNBC_ARTICLE_URL !== "#";
  return (
    <section className="dot-pattern border-b border-border-base">
      <div className="mx-auto max-w-[920px] px-6 py-16 lg:py-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-brand">
          <span className="size-1.5 rounded-full bg-brand" /> Open to work · US
          &amp; Europe
        </span>
        <h1 className="font-display mt-5 text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05]">
          Hi, I&apos;m Vishal Patil - the engineer behind ProBot.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          I build product-grade software with a{" "}
          <strong className="text-ink">Spec-Driven Development</strong> approach:
          write the spec, derive the plan, then ship in small, verifiable slices.
          ProBot itself was built this way - multi-provider LLMs, RAG, envelope
          encryption, GDPR flows, and a documented build log behind every stage.
        </p>

        <div className="mt-8 rounded-2xl border border-border-base bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold">What I bring</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SKILLS.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-border-base bg-neutral-50 px-3 py-1.5 text-xs font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-semibold text-amber-900">
            Featured by CNBC
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-900/90">
            My earlier project <strong>VAi</strong> - a personal portfolio AI
            assistant - was featured by CNBC. VAi is the engine ProBot grew out
            of. {hasCnbcLink ? (
              <a
                href={CNBC_ARTICLE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
              >
                Read the feature
              </a>
            ) : (
              <span className="font-medium">Ask me for the details.</span>
            )}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href={`mailto:${EMAIL}`}
            className="btn btn-primary !px-6 !py-3 !text-base"
          >
            Get in touch
          </a>
          <a
            href={PORTFOLIO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary !px-6 !py-3 !text-base"
          >
            Portfolio
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary !px-6 !py-3 !text-base"
          >
            GitHub
          </a>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary !px-6 !py-3 !text-base"
          >
            LinkedIn
          </a>
        </div>

        <p className="mt-8 text-sm text-muted">
          Curious how I work? Every stage of ProBot ships with a written plan and
          build log.{" "}
          <Link href="/roadmap" className="text-brand font-semibold hover:underline">
            See the roadmap →
          </Link>
        </p>
      </div>
    </section>
  );
}
