import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import { AccountTab } from "@/components/dashboard/settings/AccountTab";
import { AIModelKeyTab } from "@/components/dashboard/settings/AIModelKeyTab";
import { BotConfigTab } from "@/components/dashboard/settings/BotConfigTab";
import {
  DeployTab,
  type DeploymentMode,
} from "@/components/dashboard/settings/DeployTab";
import { KnowledgeTab } from "@/components/dashboard/settings/KnowledgeTab";
import { SecurityTab } from "@/components/dashboard/settings/SecurityTab";
import {
  SettingsTabPanel,
  SettingsTabs,
} from "@/components/dashboard/settings/SettingsTabs";
import { getPendingDeletion } from "@/lib/account/delete";
import { authOptions } from "@/lib/auth/auth";
import { bots, db, users } from "@/lib/db";
import type { Personality } from "@/lib/bots/schemas";
import { PERSONALITY_PRESETS } from "@/lib/bots/schemas";

// Settings page - 5 tabs ported from design/settings.html.
// URL state lives in `?tab=` so deep links into a specific tab work
// (e.g. /dashboard/bots/<id>/settings?tab=kb).
//
// Tabs:
//   Account            - read-only user display (write endpoints are a future addition)
//   Bot configuration  - status toggle + name/headline/personality/theme
//                         + suggested questions; PATCHes /api/bots/[botId]
//   Knowledge base     - list + delete + upload + re-index (slice-2 endpoints)
//   Security & privacy - rate-limit display + Coming Soon panels
//   AI model & key     - entire tab Coming Soon (future editor)

function isPersonality(value: string): value is Personality {
  return (PERSONALITY_PRESETS as readonly string[]).includes(value);
}

function computeInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

export default async function BotSettingsPage({
  params,
}: {
  params: { botId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.username) notFound();

  const userId = session.user.id;

  const [bot, userRow, pendingDeletion] = await Promise.all([
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
    getPendingDeletion(userId),
  ]);
  if (!bot) notFound();

  const personality = isPersonality(bot.personality)
    ? bot.personality
    : "professional";

  const accountName = session.user.name ?? session.user.username;
  const accountEmail = session.user.email ?? "";
  const accountInitials = computeInitials(accountName);

  return (
    <div className="max-w-[900px] px-6 py-8 lg:px-8">
      <SettingsTabs>
        <SettingsTabPanel tab="account">
          <AccountTab
            name={session.user.name ?? ""}
            email={accountEmail}
            username={session.user.username}
            image={session.user.image ?? null}
            initials={accountInitials}
          />
        </SettingsTabPanel>

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
            initialRateLimitPerMinute={bot.rateLimitPerMinute}
            initialRateLimitPerDay={bot.rateLimitPerDay}
            initialRateLimitMaxChars={bot.rateLimitMaxChars}
            previewToken={bot.previewToken}
          />
        </SettingsTabPanel>

        <SettingsTabPanel tab="kb">
          <KnowledgeTab botId={bot.id} />
        </SettingsTabPanel>

        <SettingsTabPanel tab="security">
          <SecurityTab
            username={session.user.username}
            pendingDeletion={
              pendingDeletion
                ? {
                    scheduledPurgeAt:
                      pendingDeletion.scheduledPurgeAt.toISOString(),
                  }
                : null
            }
          />
        </SettingsTabPanel>

        <SettingsTabPanel tab="model">
          <AIModelKeyTab
            botId={bot.id}
            provider={userRow?.llmProvider ?? null}
            model={userRow?.llmModel ?? null}
          />
        </SettingsTabPanel>

        <SettingsTabPanel tab="deploy">
          <DeployTab
            botId={bot.id}
            ownerUsername={session.user.username}
            initialMode={(bot.deploymentMode as DeploymentMode) ?? "managed"}
          />
        </SettingsTabPanel>
      </SettingsTabs>
    </div>
  );
}
