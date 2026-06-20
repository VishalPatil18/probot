import type { Metadata } from "next";

import {
  CONTACT_EMAIL,
  DELETION_GRACE_DAYS,
  JURISDICTION,
  LEGAL_EFFECTIVE_DATE,
  MINIMUM_AGE,
  OPERATOR_DESCRIPTION,
  OPERATOR_NAME,
} from "@/lib/marketing/legal";

export const metadata: Metadata = {
  title: "Terms of Service · ProBot",
  description:
    "The rules of the road for using ProBot - a free, open-source AI chatbot for job seekers.",
};

const SECTIONS = [
  { id: "acceptance", label: "Acceptance & eligibility" },
  { id: "service", label: "The service" },
  { id: "account", label: "Your account" },
  { id: "acceptable-use", label: "Acceptable use" },
  { id: "your-content", label: "Your content" },
  { id: "third-parties", label: "Third-party services" },
  { id: "ai-output", label: "AI output disclaimer" },
  { id: "fees", label: "Fees" },
  { id: "termination", label: "Termination" },
  { id: "warranties", label: "Disclaimer of warranties" },
  { id: "liability", label: "Limitation of liability" },
  { id: "indemnity", label: "Indemnification" },
  { id: "law", label: "Governing law" },
  { id: "changes", label: "Changes to these terms" },
  { id: "contact", label: "Contact" },
];

export default function TermsPage() {
  return (
    <>
      {/* HERO */}
      <section className="dot-pattern border-b border-border-base">
        <div className="mx-auto max-w-[1180px] px-6 py-16 lg:py-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-brand text-xs font-bold border border-blue-100 mb-6">
              <span className="size-1.5 rounded-full bg-brand" /> Legal
            </span>
            <h1 className="font-display text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] mb-4">
              Terms of Service
            </h1>
            <p className="text-muted">Effective {LEGAL_EFFECTIVE_DATE}.</p>
          </div>
        </div>
      </section>

      {/* BODY */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1180px] px-6 py-14 grid lg:grid-cols-[240px_1fr] gap-12">
          {/* TOC */}
          <aside className="lg:sticky lg:top-24 self-start">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted mb-3">
              On this page
            </p>
            <nav className="space-y-1 text-sm">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block py-1.5 text-muted hover:text-brand transition-colors"
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* CONTENT */}
          <div className="max-w-3xl space-y-12 text-ink leading-relaxed">
            <section id="acceptance">
              <h2 className="font-display text-2xl font-bold mb-4">
                Acceptance & eligibility
              </h2>
              <p className="text-muted">
                By creating an account or using ProBot, you agree to these Terms
                of Service and to our{" "}
                <a
                  href="/privacy"
                  className="text-brand font-semibold hover:underline"
                >
                  Privacy Policy
                </a>
                . You must be at least {MINIMUM_AGE} years old to use ProBot. If
                you are using ProBot on behalf of someone else, you confirm you
                have their authority to do so.
              </p>
            </section>

            <section id="service">
              <h2 className="font-display text-2xl font-bold mb-4">
                The service
              </h2>
              <p className="text-muted">
                ProBot is a free, open-source web application that lets you
                build an AI chatbot grounded in your résumé, LinkedIn, and
                portfolio data. The bot is then accessible via a public URL and
                an embeddable widget. ProBot is provided as-is by{" "}
                {OPERATOR_NAME}, {OPERATOR_DESCRIPTION}, with no service-level
                guarantees.
              </p>
            </section>

            <section id="account">
              <h2 className="font-display text-2xl font-bold mb-4">
                Your account
              </h2>
              <div className="space-y-3 text-muted">
                <p>
                  You are responsible for keeping your sign-in credentials and
                  any local LLM API keys secure. You are responsible for all
                  activity that occurs under your account.
                </p>
                <p>
                  You agree to provide accurate information at sign-up and to
                  keep it up to date. We may suspend or close accounts that
                  appear to have been registered fraudulently.
                </p>
              </div>
            </section>

            <section id="acceptable-use">
              <h2 className="font-display text-2xl font-bold mb-4">
                Acceptable use
              </h2>
              <p className="text-muted mb-3">Do not use ProBot to:</p>
              <ul className="space-y-2 text-muted list-disc pl-5">
                <li>
                  Impersonate another real person without their explicit written
                  consent.
                </li>
                <li>
                  Upload content you do not have the right to upload, including
                  copyrighted material you do not own or licence.
                </li>
                <li>
                  Generate or distribute content that is illegal, defamatory,
                  harassing, hateful, sexually explicit, or that exploits
                  minors.
                </li>
                <li>
                  Attempt to compromise the security of ProBot, its
                  infrastructure, or other users - including prompt injection or
                  jailbreak attacks against bots that are not your own.
                </li>
                <li>
                  Scrape, crawl, or automate access to other users&apos; bots,
                  conversations, or leads.
                </li>
                <li>
                  Use ProBot to send unsolicited bulk messages, spam, or
                  marketing communications.
                </li>
                <li>
                  Circumvent any rate limits, technical restrictions, or access
                  controls.
                </li>
              </ul>
              <p className="text-muted mt-4">
                We may suspend or terminate accounts that violate these rules,
                with or without notice.
              </p>
            </section>

            <section id="your-content">
              <h2 className="font-display text-2xl font-bold mb-4">
                Your content
              </h2>
              <div className="space-y-3 text-muted">
                <p>
                  You retain full ownership of everything you upload to ProBot -
                  your résumé, your LinkedIn data, your portfolio, your bot
                  configurations, and the conversations on your bot.
                </p>
                <p>
                  You grant ProBot a limited, non-exclusive, royalty-free
                  licence to host, process, embed, and display your content
                  strictly for the purpose of operating the service for you.
                  This licence ends when you delete the content or your account.
                </p>
                <p>
                  You are responsible for the accuracy and legality of the
                  content you upload, including any third-party content (such as
                  employer references, project descriptions, or testimonials)
                  for which you must have permission to use.
                </p>
              </div>
            </section>

            <section id="third-parties">
              <h2 className="font-display text-2xl font-bold mb-4">
                Third-party services
              </h2>
              <p className="text-muted">
                ProBot integrates with third-party services including hosting
                providers, OAuth identity providers, email delivery, and the LLM
                provider you choose. These services are operated by their own
                providers under their own terms. ProBot is not responsible for
                the availability, performance, pricing, or policies of any
                third-party service, including any service you bring your own
                API key for.
              </p>
            </section>

            <section
              id="ai-output"
              className="bg-blue-50/40 border border-blue-100 rounded-2xl p-6"
            >
              <h2 className="font-display text-2xl font-bold mb-4">
                AI output disclaimer
              </h2>
              <div className="space-y-3 text-muted">
                <p>
                  ProBot uses third-party large language models to generate
                  responses. AI output can be inaccurate, incomplete, biased, or
                  misleading, even when grounded in your data. ProBot makes no
                  warranty that any bot response is accurate, current, or
                  suitable for any particular purpose.
                </p>
                <p>
                  Recruiters, hiring managers, and other visitors who interact
                  with a ProBot should treat its responses as a starting point,
                  not as verified fact. The owner of each bot, not ProBot, is
                  responsible for the content their bot is configured to
                  represent.
                </p>
              </div>
            </section>

            <section id="fees">
              <h2 className="font-display text-2xl font-bold mb-4">Fees</h2>
              <p className="text-muted">
                ProBot is offered free of charge and there are no paid tiers.
                Any cost you incur from your chosen LLM provider, by using your
                own API key, is between you and that provider - ProBot does not
                receive any portion of it.
              </p>
            </section>

            <section id="termination">
              <h2 className="font-display text-2xl font-bold mb-4">
                Termination
              </h2>
              <div className="space-y-3 text-muted">
                <p>
                  You can stop using ProBot at any time. To delete your account
                  and all associated data, email{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="text-brand font-semibold hover:underline"
                  >
                    {CONTACT_EMAIL}
                  </a>
                  . We will complete deletion within {DELETION_GRACE_DAYS} days.
                </p>
                <p>
                  We may suspend or terminate your access to ProBot, with or
                  without notice, if we believe you have violated these terms,
                  if required by law, or if continued operation would be
                  technically or commercially unreasonable.
                </p>
              </div>
            </section>

            <section id="warranties">
              <h2 className="font-display text-2xl font-bold mb-4">
                Disclaimer of warranties
              </h2>
              <p className="text-muted uppercase text-sm tracking-wide">
                ProBot is provided &ldquo;as is&rdquo; and &ldquo;as
                available&rdquo;, without warranties of any kind, whether
                express or implied, including but not limited to the implied
                warranties of merchantability, fitness for a particular purpose,
                and non-infringement. We do not warrant that the service will be
                uninterrupted, error-free, or secure, or that AI-generated
                output will be accurate.
              </p>
            </section>

            <section id="liability">
              <h2 className="font-display text-2xl font-bold mb-4">
                Limitation of liability
              </h2>
              <p className="text-muted">
                To the maximum extent permitted by law, {OPERATOR_NAME} shall
                not be liable for any indirect, incidental, special,
                consequential, or punitive damages, or any loss of profits,
                revenue, data, or goodwill, arising out of or related to your
                use of ProBot. Because ProBot is offered free of charge, total
                aggregate liability for any claim arising from or related to
                these terms or the service is limited to one United States
                dollar (USD $1.00).
              </p>
            </section>

            <section id="indemnity">
              <h2 className="font-display text-2xl font-bold mb-4">
                Indemnification
              </h2>
              <p className="text-muted">
                You agree to indemnify, defend, and hold harmless{" "}
                {OPERATOR_NAME} from any claim, demand, loss, or damage -
                including reasonable legal fees - arising from your content,
                your use of the service, your violation of these terms, or your
                violation of any law or the rights of any third party.
              </p>
            </section>

            <section id="law">
              <h2 className="font-display text-2xl font-bold mb-4">
                Governing law
              </h2>
              <p className="text-muted">
                These terms are governed by the laws of the {JURISDICTION},
                without regard to conflict-of-law principles. Any dispute
                arising under these terms shall be brought in the state or
                federal courts located in that jurisdiction, and you consent to
                personal jurisdiction there.
              </p>
            </section>

            <section id="changes">
              <h2 className="font-display text-2xl font-bold mb-4">
                Changes to these terms
              </h2>
              <p className="text-muted">
                We may update these terms from time to time. When we do, we will
                update the &ldquo;Effective&rdquo; date at the top of the page.
                For material changes, we will notify signed-in users via the
                dashboard before the change takes effect. Continued use of
                ProBot after the new terms take effect constitutes acceptance.
              </p>
            </section>

            <section id="contact">
              <h2 className="font-display text-2xl font-bold mb-4">Contact</h2>
              <p className="text-muted">
                Questions about these terms?{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-brand font-semibold hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
