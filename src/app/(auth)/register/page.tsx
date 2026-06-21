import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Create your account · ProBot",
  description: "Build your AI assistant in 2 minutes.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
