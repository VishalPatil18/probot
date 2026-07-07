import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import { AccountTab } from "@/components/dashboard/settings/AccountTab";
import { SecurityTab } from "@/components/dashboard/settings/SecurityTab";
import {
  SettingsTabPanel,
  SettingsTabs,
  type SettingsTabKey,
} from "@/components/dashboard/settings/SettingsTabs";
import { NotificationsInbox } from "@/components/dashboard/notifications/NotificationsInbox";
import { getPendingDeletion } from "@/lib/account/delete";
import { authOptions } from "@/lib/auth/auth";
import { bots, db } from "@/lib/db";

// Bot-scoped settings.
//
// Since the introduction of the dedicated Bot Configuration page, this page
// only surfaces user-level concerns:
//   Account            - profile + password + photo
//   Notifications      - full inbox (list + mark read + delete)
//   Security & privacy - rate-limit display, export, delete-account
//
// Legacy deep links that referenced the now-migrated tabs (?tab=bot / kb /
// model) are 302-redirected to /dashboard/bots/[botId]/configuration so
// bookmarks + shared URLs from before this refactor keep working.

const CONFIGURATION_TABS = new Set(["bot", "kb", "model"]);

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
  searchParams,
}: {
  params: { botId: string };
  searchParams?: { tab?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.username) notFound();

  const userId = session.user.id;

  const requestedTab = searchParams?.tab;
  if (requestedTab && CONFIGURATION_TABS.has(requestedTab)) {
    redirect(
      `/dashboard/bots/${params.botId}/configuration?tab=${requestedTab}`,
    );
  }

  const [bot, pendingDeletion] = await Promise.all([
    db.query.bots.findFirst({
      where: and(eq(bots.id, params.botId), eq(bots.userId, userId)),
      columns: { id: true },
    }),
    getPendingDeletion(userId),
  ]);
  if (!bot) notFound();

  const accountName = session.user.name ?? session.user.username;
  const accountEmail = session.user.email ?? "";
  const accountInitials = computeInitials(accountName);

  const visibleTabs: SettingsTabKey[] = ["account", "notifications", "security"];

  return (
    <div className="max-w-[900px] px-6 py-8 lg:px-8">
      <SettingsTabs tabs={visibleTabs}>
        <SettingsTabPanel tab="account">
          <AccountTab
            name={session.user.name ?? ""}
            email={accountEmail}
            username={session.user.username}
            image={session.user.image ?? null}
            initials={accountInitials}
          />
        </SettingsTabPanel>

        <SettingsTabPanel tab="notifications">
          <NotificationsInbox />
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
      </SettingsTabs>
    </div>
  );
}
