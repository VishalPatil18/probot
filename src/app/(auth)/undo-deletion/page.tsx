import type { Metadata } from "next";

import { UndoDeletionForm } from "@/components/auth/UndoDeletionForm";

export const metadata: Metadata = {
  title: "Undo account deletion · ProBot",
  description:
    "Cancel a scheduled ProBot account deletion within the 7-day grace period.",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: { token?: string };
}

export default function UndoDeletionPage({ searchParams }: PageProps) {
  return <UndoDeletionForm token={searchParams.token ?? ""} />;
}
