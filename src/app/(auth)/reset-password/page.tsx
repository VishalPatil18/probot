import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password · ProBot",
  description: "Choose a new password for your ProBot account.",
};

interface PageProps {
  searchParams: { token?: string };
}

export default function ResetPasswordPage({ searchParams }: PageProps) {
  return <ResetPasswordForm token={searchParams.token ?? ""} />;
}
