import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { NotificationsInbox } from "@/components/dashboard/notifications/NotificationsInbox";
import { authOptions } from "@/lib/auth/auth";

export const metadata = {
  title: "Notifications · ProBot",
};

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/notifications");
  }

  return (
    <div className="max-w-[900px] px-6 py-8 lg:px-8">
      <h1 className="font-display text-2xl font-extrabold tracking-tight mb-6">
        Notifications
      </h1>
      <NotificationsInbox />
    </div>
  );
}
