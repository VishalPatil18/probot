import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import { AccountTab } from "@/components/dashboard/settings/AccountTab";
import { SecurityTab } from "@/components/dashboard/settings/SecurityTab";
import {
  SettingsTabPanel,
  SettingsTabs,
} from "@/components/dashboard/settings/SettingsTabs";
import { NotificationsInbox } from "@/components/dashboard/notifications/NotificationsInbox";
import { getPendingDeletion } from "@/lib/account/delete";
import { authOptions } from "@/lib/auth/auth";

// Bot-independent settings, reachable without a bot. Sidebar Settings link
// + profile-row link point here when no bot is selected. Bot-scoped
// versions live at /dashboard/bots/[botId]/settings and expose the same
// three tabs (Account, Notifications, Security & privacy).

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
  const pendingDeletion = await getPendingDeletion(userId);

  const accountInitials = computeInitials(
    session.user.name ?? session.user.username,
  );

  return (
    <div className="max-w-[900px] px-6 py-8 lg:px-8">
      <SettingsTabs tabs={["account", "notifications", "security"]}>
        <SettingsTabPanel tab="account">
          <AccountTab
            name={session.user.name ?? ""}
            email={session.user.email ?? ""}
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
