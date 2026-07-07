import { Icon } from "@/components/ui/Icon";
import { buildMetadata } from "@/lib/seo/site";

export const metadata = buildMetadata({
  title: "Hire Vishal Patil",
  description:
    "Vishal Patil built ProBot. Spec-Driven Development, full-stack + AI engineering, open to roles across the US and Europe.",
  path: "/hire-me",
});

const PORTFOLIO_URL = "https://vishalpatil.vercel.app/";
const GITHUB_URL = "https://github.com/VishalPatil18";
const LINKEDIN_URL = "https://www.linkedin.com/in/vishalrameshpatil/";
const EMAIL = "vishalpatil.imp@gmail.com";
const CNBC_ARTICLE_URL =
  "https://www.cnbc.com/2026/04/30/these-2-job-seekers-built-ai-chatbots-to-talk-to-recruiters-for-them.html";

const SKILLS = [
  "Spec-Driven Development",
  "Full-stack (Next.js · TypeScript)",
  "RAG & GenAI integrations",
  "Multi-provider LLM systems",
  "Security & GDPR-by-design",
  "Postgres · Drizzle ORM",
];

export default function HireMePage() {
  return (
    <section className="dot-pattern border-b border-border-base">
      <div className="mx-auto max-w-[920px] px-6 py-16 lg:py-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-brand">
          <span className="size-1.5 rounded-full bg-brand" /> Open to work · US
          &amp; Europe
        </span>
        <h1 className="font-display mt-5 text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05]">
          Hi, I&apos;m Vishal Patil
        </h1>
        <h3 className="font-display mt-5 text-2xl font-bold tracking-tight leading-[1.05]">
          I build AI products people actually use.
        </h3>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted text-justify">
          I&apos;m a AI engineer and researcher who ships end-to-end{" "}
          <a
            href="https://vishalpatil.vercel.app/build"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand font-semibold hover:underline"
          >
            products
          </a>{" "}
          from specifications to production. My last project,{" "}
          <a
            href="https://vishalpatil.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand font-semibold hover:underline"
          >
            VAi
          </a>{" "}
          an AI assistant that talks to recruiters on a job seeker&apos;s
          behalf, went viral and was{" "}
          <a
            href={CNBC_ARTICLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand font-semibold hover:underline"
          >
            featured by CNBC
          </a>
          . So many people asked for their own that I turned the idea into{" "}
          <strong className="text-ink">ProBot</strong> a free, open-source
          platform anyone can use.
        </p>

        <div className="mt-8 max-w-3xl rounded-2xl border border-border-base bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold">What I bring to the table</p>
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

        <div className="mt-6 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-semibold text-amber-900">
            As featured by CNBC
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-900/90">
            CNBC covered <strong>VAi</strong> - my AI assistant that chats with
            recruiters for job seekers - and the engineer behind it. That
            attention, and the flood of people wanting their own, is exactly why
            ProBot exists.{" "}
            <a
              href={CNBC_ARTICLE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline"
            >
              Read the CNBC Article
            </a>
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href={PORTFOLIO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            <Icon name="portfolio" className="!text-base text-brand" />
            Portfolio
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            <Icon name="github" className="!text-base text-brand" />
            GitHub
          </a>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            <Icon name="linkedin" className="!text-base text-brand" />
            LinkedIn
          </a>
          <a
            href={`mailto:${EMAIL}`}
            className="btn btn-primary !px-6 !py-3 !text-base"
          >
            Get in touch
          </a>
        </div>
      </div>
    </section>
  );
}
