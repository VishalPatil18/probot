import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth/auth";

import { RegisterSelfHostedForm } from "./RegisterSelfHostedForm";

export const metadata = {
  title: "Register a self-hosted bot · ProBot",
};

// Minimal creation surface for self-hosted bots. Unlike Bot Factory (which
// covers persona/knowledge/provider for managed bots), a self-hosted bot is
// configured entirely inside the consumer's webapp via the
// `probot-self-hosted` npm package. The dashboard only needs a name so the
// analytics rollup (conversations + leads) has something meaningful to
// group under.
export default async function NewSelfHostedBotPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/bots/new-self-hosted");
  }

  return (
    <div className="max-w-xl px-6 py-14 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-3">
        Register a self-hosted bot
      </p>
      <h1 className="font-display text-3xl font-extrabold tracking-tight mb-3">
        Give your bot a name.
      </h1>
      <p className="text-muted leading-relaxed mb-8">
        We&apos;ll create the dashboard entry and mint your first token. Persona,
        knowledge, provider, and theme all live in your webapp&apos;s{" "}
        <code>probot-self-hosted</code> config.
      </p>
      <RegisterSelfHostedForm />
    </div>
  );
}
