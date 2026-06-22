import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import { AccountTab } from "@/components/dashboard/settings/AccountTab";
import { AIModelKeyTab } from "@/components/dashboard/settings/AIModelKeyTab";
import { SecurityTab } from "@/components/dashboard/settings/SecurityTab";
import {
  SettingsTabPanel,
  SettingsTabs,
} from "@/components/dashboard/settings/SettingsTabs";
import { getPendingDeletion } from "@/lib/account/delete";
import { authOptions } from "@/lib/auth/auth";
import { db, users } from "@/lib/db";

// Account-only settings, reachable without a bot (the bot-scoped settings page
// lives at /dashboard/bots/[botId]/settings). Shows Account, Security & privacy,
// and AI model & key (provider/model switcher; the per-bot managed-key section
// is hidden here since there's no bot). The sidebar "Settings" link + the
// profile-row link point here when the user has no bot selected.

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

export default async function AccountSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.username) notFound();

  const userId = session.user.id;
  const [userRow, pendingDeletion] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { llmProvider: true, llmModel: true },
    }),
    getPendingDeletion(userId),
  ]);

  const accountInitials = computeInitials(
    session.user.name ?? session.user.username,
  );

  return (
    <div className="max-w-[900px] px-6 py-8 lg:px-8">
      <SettingsTabs tabs={["account", "security", "model"]}>
        <SettingsTabPanel tab="account">
          <AccountTab
            name={session.user.name ?? ""}
            email={session.user.email ?? ""}
            username={session.user.username}
            image={session.user.image ?? null}
            initials={accountInitials}
          />
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
            botId={null}
            provider={userRow?.llmProvider ?? null}
            model={userRow?.llmModel ?? null}
          />
        </SettingsTabPanel>
      </SettingsTabs>
    </div>
  );
}
