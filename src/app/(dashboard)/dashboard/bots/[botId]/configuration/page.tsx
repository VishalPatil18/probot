import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import { AIModelKeyTab } from "@/components/dashboard/settings/AIModelKeyTab";
import { BotAdvancedTab } from "@/components/dashboard/settings/BotAdvancedTab";
import { BotConfigTab } from "@/components/dashboard/settings/BotConfigTab";
import { KnowledgeTab } from "@/components/dashboard/settings/KnowledgeTab";
import {
  SettingsTabPanel,
  SettingsTabs,
  type SettingsTabKey,
} from "@/components/dashboard/settings/SettingsTabs";
import { authOptions } from "@/lib/auth/auth";
import type { Personality } from "@/lib/bots/schemas";
import { PERSONALITY_PRESETS } from "@/lib/bots/schemas";
import { bots, db, users } from "@/lib/db";

// Bot Configuration - the per-bot editor for name/persona/theme, knowledge
// base, and AI model & API key. Split out from Settings so the sidebar's
// "Build" section has a direct entry point and the Settings page can stay
// user-scoped.
//
// Self-hosted bots have no editable platform-side config (persona +
// knowledge + provider all live in the consumer's webapp), so we redirect
// them back to the dashboard rather than render a confusing screen.

export const metadata = {
  title: "Bot Configuration · ProBot",
};

function isPersonality(value: string): value is Personality {
  return (PERSONALITY_PRESETS as readonly string[]).includes(value);
}

export default async function BotConfigurationPage({
  params,
}: {
  params: { botId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.username) notFound();

  const userId = session.user.id;

  const [bot, userRow] = await Promise.all([
    db.query.bots.findFirst({
      where: and(eq(bots.id, params.botId), eq(bots.userId, userId)),
      columns: {
        id: true,
        name: true,
        headline: true,
        image: true,
        personality: true,
        suggestedQuestions: true,
        isActive: true,
        themeColor: true,
        customInstructions: true,
        rateLimitPerMinute: true,
        rateLimitPerDay: true,
        rateLimitMaxChars: true,
        previewToken: true,
        deploymentMode: true,
      },
    }),
    db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { llmProvider: true, llmModel: true },
    }),
  ]);
  if (!bot) notFound();

  const mode = (bot.deploymentMode as "managed" | "self_hosted") ?? "managed";
  if (mode === "self_hosted") {
    // Self-hosted bots configure themselves via probot-self-hosted; there is
    // nothing meaningful to edit here.
    redirect("/dashboard");
  }

  const personality = isPersonality(bot.personality)
    ? bot.personality
    : "professional";

  const visibleTabs: SettingsTabKey[] = ["bot", "kb", "model", "advanced"];

  return (
    <div className="max-w-[900px] px-6 py-8 lg:px-8">
      <SettingsTabs tabs={visibleTabs}>
        <SettingsTabPanel tab="bot">
          <BotConfigTab
            botId={bot.id}
            ownerUsername={session.user.username}
            initialImage={bot.image}
            initialName={bot.name}
            initialHeadline={bot.headline ?? ""}
            initialPersonality={personality}
            initialSuggestedQuestions={bot.suggestedQuestions ?? []}
            initialIsActive={bot.isActive}
            initialThemeColor={bot.themeColor}
            initialCustomInstructions={bot.customInstructions ?? ""}
            previewToken={bot.previewToken}
          />
        </SettingsTabPanel>

        <SettingsTabPanel tab="kb">
          <KnowledgeTab botId={bot.id} />
        </SettingsTabPanel>

        <SettingsTabPanel tab="model">
          <AIModelKeyTab
            botId={bot.id}
            provider={userRow?.llmProvider ?? null}
            model={userRow?.llmModel ?? null}
          />
        </SettingsTabPanel>

        <SettingsTabPanel tab="advanced">
          <BotAdvancedTab
            botId={bot.id}
            botName={bot.name}
            initialName={bot.name}
            initialHeadline={bot.headline ?? ""}
            initialPersonality={personality}
            initialSuggestedQuestions={bot.suggestedQuestions ?? []}
            initialThemeColor={bot.themeColor}
            initialCustomInstructions={bot.customInstructions ?? ""}
            initialRateLimitPerMinute={bot.rateLimitPerMinute}
            initialRateLimitPerDay={bot.rateLimitPerDay}
            initialRateLimitMaxChars={bot.rateLimitMaxChars}
          />
        </SettingsTabPanel>
      </SettingsTabs>
    </div>
  );
}
