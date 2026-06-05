import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { BotFactoryForm } from "@/components/bot-factory/BotFactoryForm";
import { isProviderName, type ProviderName } from "@/lib/ai/providers";
import { authOptions } from "@/lib/auth/auth";
import type { Personality } from "@/lib/bots/schemas";
import { PERSONALITY_PRESETS } from "@/lib/bots/schemas";
import { bots, db, users } from "@/lib/db";

export const metadata = {
  title: "Create your bot · ProBot",
};

function isPersonality(value: string): value is Personality {
  return (PERSONALITY_PRESETS as readonly string[]).includes(value);
}

export default async function NewBotPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.username) {
    redirect("/login?next=/dashboard/bots/new");
  }

  const userRow = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { username: true, llmProvider: true, llmModel: true },
  });
  if (!userRow) redirect("/login");

  const existing = await db.query.bots.findFirst({
    where: eq(bots.userId, session.user.id),
  });

  const initialLlmProvider: ProviderName | undefined = isProviderName(
    userRow.llmProvider,
  )
    ? userRow.llmProvider
    : undefined;

  return (
    <BotFactoryForm
      username={userRow.username}
      initialBot={
        existing
          ? {
              id: existing.id,
              name: existing.name,
              headline: existing.headline,
              personality: isPersonality(existing.personality)
                ? existing.personality
                : "professional",
              contextText: existing.contextText,
              suggestedQuestions: existing.suggestedQuestions ?? [],
            }
          : undefined
      }
      initialLlmProvider={initialLlmProvider}
      initialLlmModel={userRow.llmModel ?? undefined}
    />
  );
}
