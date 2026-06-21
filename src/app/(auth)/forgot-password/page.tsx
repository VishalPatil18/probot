import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password · ProBot",
  description: "Reset your ProBot password.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
