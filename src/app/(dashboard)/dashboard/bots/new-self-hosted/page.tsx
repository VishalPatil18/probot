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

  // Layout scaffolding mirrors BotFactoryForm's wrapper so the two creation
  // surfaces feel like the same product. Self-hosted is a single-step form
  // (persona/knowledge/model live in the consumer's webapp), so there's no
  // stepper and no live preview column — just the same padded max-width
  // container BotFactory renders each step inside.
  return (
    <div className="flex flex-col lg:h-full lg:overflow-hidden">
      <div className="w-full max-w-[1280px] mx-auto lg:flex-1 lg:min-h-0">
        <div className="px-6 lg:px-12 py-10 lg:overflow-y-auto">
          <div className="max-w-lg">
            <RegisterSelfHostedForm />
          </div>
        </div>
      </div>
    </div>
  );
}
