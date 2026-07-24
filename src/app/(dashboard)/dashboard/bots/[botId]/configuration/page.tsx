import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import { AIModelKeyTab } from "@/components/dashboard/settings/AIModelKeyTab";
import { BotAdvancedTab } from "@/components/dashboard/settings/BotAdvancedTab";
import { BotConfigTab } from "@/components/dashboard/settings/BotConfigTab";
import { KnowledgeTab } from "@/components/dashboard/settings/KnowledgeTab";
import { SelfHostedDangerZone } from "@/components/dashboard/settings/SelfHostedDangerZone";
import { SelfHostedTokens } from "@/components/dashboard/settings/SelfHostedTokens";
import {
  SettingsTabPanel,
  SettingsTabs,
  type SettingsTabKey,
} from "@/components/dashboard/settings/SettingsTabs";
import { authOptions } from "@/lib/auth/auth";
import type { Personality } from "@/lib/bots/schemas";
import { PERSONALITY_PRESETS } from "@/lib/bots/schemas";
import { bots, db, users } from "@/lib/db";

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
    return (
      <div className="max-w-[900px] space-y-6 px-6 py-8 lg:px-8">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-extrabold tracking-tight">
              {bot.name}
            </h2>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
              Self-hosted
            </span>
          </div>
          {bot.headline ? (
            <p className="mt-1 text-sm text-muted">{bot.headline}</p>
          ) : null}
          <p className="mt-2 text-xs text-muted">
            This bot runs on your own infrastructure. Its persona, knowledge,
            and API key live in your app - ProBot stores the dashboard entry and
            its access tokens.
          </p>
        </div>
        <SelfHostedTokens botId={bot.id} />
        <SelfHostedDangerZone botId={bot.id} botName={bot.name} />
      </div>
    );
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
