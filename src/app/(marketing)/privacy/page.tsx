import type { Metadata } from "next";

import {
  CONTACT_EMAIL,
  DELETION_GRACE_DAYS,
  GOOGLE_USER_DATA_POLICY_URL,
  JURISDICTION,
  LEGAL_EFFECTIVE_DATE,
  MINIMUM_AGE,
  OPERATOR_DESCRIPTION,
  OPERATOR_NAME,
} from "@/lib/marketing/legal";

export const metadata: Metadata = {
  title: "Privacy Policy · ProBot",
  description:
    "How ProBot collects, uses, stores, and protects your data - including data obtained via Google Sign-In.",
};

const SECTIONS = [
  { id: "summary", label: "Plain-language summary" },
  { id: "operator", label: "Who operates ProBot" },
  { id: "data-we-collect", label: "Data we collect" },
  { id: "google-sign-in", label: "Google Sign-In data" },
  { id: "how-we-use", label: "How we use your data" },
  { id: "third-parties", label: "Third-party services" },
  { id: "storage", label: "Storage & retention" },
  { id: "your-rights", label: "Your rights & deletion" },
  { id: "security", label: "Security" },
  { id: "children", label: "Children" },
  { id: "changes", label: "Changes to this policy" },
  { id: "contact", label: "Contact" },
];

export default function PrivacyPage() {
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
              Privacy Policy
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
            <section id="summary">
              <h2 className="font-display text-2xl font-bold mb-4">
                Plain-language summary
              </h2>
              <p className="text-muted">
                ProBot is a free, open-source AI chatbot that turns your resume
                into a conversational representative. The shortest version of
                this policy:
              </p>
              <ul className="mt-4 space-y-2 text-muted list-disc pl-5">
                <li>
                  We collect the minimum needed to give you an account and run
                  your bot - typically your email, your display name, your
                  profile image (if you signed in with Google or GitHub), and
                  the content you upload.
                </li>
                <li>
                  Your LLM API key is stored in your browser. It never reaches
                  our servers.
                </li>
                <li>
                  We do not sell your data. We do not share it for advertising.
                  We do not read individual conversations or leads for any
                  purpose other than security or your explicit support request.
                </li>
                <li>
                  Email us at{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="text-brand font-semibold hover:underline"
                  >
                    {CONTACT_EMAIL}
                  </a>{" "}
                  and we will delete your account and all associated data within{" "}
                  {DELETION_GRACE_DAYS} days.
                </li>
              </ul>
            </section>

            <section id="operator">
              <h2 className="font-display text-2xl font-bold mb-4">
                Who operates ProBot
              </h2>
              <p className="text-muted">
                ProBot is operated by {OPERATOR_NAME}, {OPERATOR_DESCRIPTION}.
                There is no company, no investors, and no employees behind it.
                For all privacy, data-access, or deletion requests, the operator
                is the data controller and is reachable at{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-brand font-semibold hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </section>

            <section id="data-we-collect">
              <h2 className="font-display text-2xl font-bold mb-4">
                Data we collect
              </h2>
              <p className="text-muted mb-4">
                We collect only what the product needs to function. Concretely:
              </p>
              <div className="space-y-4 text-muted">
                <div>
                  <h3 className="font-bold text-ink mb-1">Account data</h3>
                  <p>
                    Email address, display name, and (optionally) a profile
                    image. These come from your sign-in provider (Google,
                    GitHub) or from the form you complete during password
                    sign-up. We also assign you a username so your bot can have
                    a public URL.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-ink mb-1">Bot content</h3>
                  <p>
                    Resume PDFs, LinkedIn URLs, portfolio links, and any text
                    you add as knowledge. This is chunked, embedded into
                    vectors, and stored so your bot can answer questions about
                    you.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-ink mb-1">
                    Conversations and leads
                  </h3>
                  <p>
                    When a visitor chats with your bot, the messages are stored
                    so you can review them later in your dashboard. If a visitor
                    provides their email and name as a lead, those are stored
                    too - visible only to you, the bot owner.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-ink mb-1">
                    Authentication tokens
                  </h3>
                  <p>
                    Session cookies and OAuth tokens for as long as you remain
                    signed in. We do not log the contents of your sessions.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-ink mb-1">
                    What we do NOT collect
                  </h3>
                  <p>
                    Your LLM API key is stored only in your browser&apos;s local
                    storage. It is never transmitted to our servers, and we
                    cannot see it. We do not run analytics or behavioural
                    trackers. We do not collect your IP address for marketing.
                    We do not buy data about you from anyone.
                  </p>
                </div>
              </div>
            </section>

            <section
              id="google-sign-in"
              className="bg-blue-50/40 border border-blue-100 rounded-2xl p-6"
            >
              <h2 className="font-display text-2xl font-bold mb-4">
                Google Sign-In data
              </h2>
              <p className="text-muted mb-4">
                This section explains, specifically and in plain English, how
                ProBot handles data obtained when you sign in with Google.
              </p>
              <div className="space-y-4 text-muted">
                <div>
                  <h3 className="font-bold text-ink mb-1">
                    What we request from Google
                  </h3>
                  <p>
                    ProBot requests only the standard OpenID Connect scopes:{" "}
                    <code className="text-xs bg-white border border-border-base rounded px-1.5 py-0.5">
                      openid
                    </code>
                    ,{" "}
                    <code className="text-xs bg-white border border-border-base rounded px-1.5 py-0.5">
                      email
                    </code>
                    , and{" "}
                    <code className="text-xs bg-white border border-border-base rounded px-1.5 py-0.5">
                      profile
                    </code>
                    . We do not request access to Gmail, Drive, Calendar,
                    Contacts, or any other Google service.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-ink mb-1">
                    What we store from Google
                  </h3>
                  <p>
                    Your email address, your display name, your profile image
                    URL, and the provider account ID Google issues. These fields
                    populate your ProBot account and let you sign in again next
                    time.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-ink mb-1">
                    How we use Google data
                  </h3>
                  <p>
                    Strictly to authenticate you and to display your own account
                    information back to you (e.g. your name on your dashboard).
                    We do not use Google data for advertising. We do not train
                    AI models on Google user data. We do not transfer it to
                    anyone for unrelated purposes.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-ink mb-1">
                    Limited Use compliance
                  </h3>
                  <p>
                    ProBot&apos;s use of information received from Google APIs
                    adheres to the{" "}
                    <a
                      href={GOOGLE_USER_DATA_POLICY_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand font-semibold hover:underline"
                    >
                      Google API Services User Data Policy
                    </a>
                    , including the Limited Use requirements.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-ink mb-1">Revoking access</h3>
                  <p>
                    You can revoke ProBot&apos;s Google access at any time from
                    your{" "}
                    <a
                      href="https://myaccount.google.com/permissions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand font-semibold hover:underline"
                    >
                      Google Account permissions page
                    </a>
                    . Revoking access prevents future sign-ins but does not
                    delete the account data already stored with ProBot - for
                    that, request deletion as described below.
                  </p>
                </div>
              </div>
            </section>

            <section id="how-we-use">
              <h2 className="font-display text-2xl font-bold mb-4">
                How we use your data
              </h2>
              <p className="text-muted mb-4">
                We use the data we collect only to:
              </p>
              <ul className="space-y-2 text-muted list-disc pl-5">
                <li>
                  Create and maintain your account, and let you sign back in.
                </li>
                <li>
                  Power your bot: chunk and embed your uploaded content so it
                  can be retrieved when a visitor asks a question.
                </li>
                <li>
                  Show you your own dashboard: bots, conversations, leads,
                  notifications.
                </li>
                <li>
                  Send you account-related email (magic-link sign-in, lead
                  notifications you have opted into). We do not send marketing
                  email.
                </li>
                <li>
                  Investigate and prevent abuse, fraud, or violations of the
                  Terms of Service.
                </li>
              </ul>
            </section>

            <section id="third-parties">
              <h2 className="font-display text-2xl font-bold mb-4">
                Third-party services
              </h2>
              <p className="text-muted mb-4">
                ProBot relies on a small number of third-party services to
                function. Each is named here so you can review their own privacy
                policies if you wish:
              </p>
              <ul className="space-y-2 text-muted list-disc pl-5">
                <li>
                  <strong className="text-ink">Supabase</strong> - managed
                  PostgreSQL hosting for your account data, bot content, and
                  conversations.
                </li>
                <li>
                  <strong className="text-ink">Vercel</strong> - application
                  hosting and edge networking.
                </li>
                <li>
                  <strong className="text-ink">Google</strong> and{" "}
                  <strong className="text-ink">GitHub</strong> - optional OAuth
                  sign-in providers.
                </li>
                <li>
                  <strong className="text-ink">Resend</strong> - transactional
                  email delivery for magic-link sign-in and notifications.
                </li>
                <li>
                  <strong className="text-ink">Your chosen LLM provider</strong>{" "}
                  (Anthropic, OpenAI, Google AI Studio, etc.) - invoked from
                  your own browser using your own API key, never proxied through
                  our servers.
                </li>
              </ul>
              <p className="text-muted mt-4">
                We do not sell, rent, or share your personal data with any third
                party for their own purposes. Data passes to these services only
                insofar as needed for them to perform their function for you.
              </p>
            </section>

            <section id="storage">
              <h2 className="font-display text-2xl font-bold mb-4">
                Storage & retention
              </h2>
              <div className="space-y-3 text-muted">
                <p>
                  Account data and bot content are retained for as long as your
                  account exists. Conversations and captured leads are retained
                  for as long as the associated bot exists.
                </p>
                <p>
                  If you delete a bot, its conversations, leads, and knowledge
                  chunks are removed within 30 days. If you delete your account
                  (or email us to do so), all of the above plus your account
                  record are removed within {DELETION_GRACE_DAYS} days.
                </p>
                <p>
                  We may keep minimal records longer where required by law - for
                  example, a record that an account existed and was deleted on a
                  given date, for audit purposes.
                </p>
              </div>
            </section>

            <section id="your-rights">
              <h2 className="font-display text-2xl font-bold mb-4">
                Your rights & deletion
              </h2>
              <p className="text-muted mb-4">
                Depending on where you live, you may have rights under laws such
                as the EU/UK GDPR, the California CCPA, the Maryland Online Data
                Privacy Act, or similar regimes - including the right to access,
                correct, port, restrict, or delete the personal data we hold
                about you, and to withdraw consent.
              </p>
              <p className="text-muted mb-4">
                To exercise any of these rights, or simply to delete your
                account and all associated data, email{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-brand font-semibold hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>{" "}
                from the address associated with your account. We will respond
                and complete deletion within {DELETION_GRACE_DAYS} days.
              </p>
              <p className="text-muted">
                You can also disconnect Google or GitHub sign-in from the
                provider&apos;s own account settings, which prevents future
                sign-ins through that provider.
              </p>
            </section>

            <section id="security">
              <h2 className="font-display text-2xl font-bold mb-4">Security</h2>
              <p className="text-muted">
                Data is transmitted over HTTPS. Account passwords (when used)
                are hashed with bcrypt. Sensitive credentials such as LLM API
                keys are stored only in your browser, not on our servers. No
                system is perfectly secure, however, and we cannot guarantee
                absolute security. If you become aware of a vulnerability,
                please report it to{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-brand font-semibold hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </section>

            <section id="children">
              <h2 className="font-display text-2xl font-bold mb-4">Children</h2>
              <p className="text-muted">
                ProBot is not directed at and not intended for use by anyone
                under the age of {MINIMUM_AGE}. We do not knowingly collect
                personal data from anyone under {MINIMUM_AGE}. If you believe a
                child has provided data to ProBot, contact us and we will delete
                it.
              </p>
            </section>

            <section id="changes">
              <h2 className="font-display text-2xl font-bold mb-4">
                Changes to this policy
              </h2>
              <p className="text-muted">
                We may update this policy from time to time. When we do, we will
                update the &ldquo;Effective&rdquo; date at the top of the page.
                For material changes that affect how we handle your personal
                data, we will notify signed-in users via the dashboard before
                the change takes effect.
              </p>
            </section>

            <section id="contact">
              <h2 className="font-display text-2xl font-bold mb-4">Contact</h2>
              <p className="text-muted">
                Privacy questions, data-access requests, deletion requests, or
                anything else covered by this policy:{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-brand font-semibold hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>
                . ProBot is governed by the laws of the {JURISDICTION}.
              </p>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
