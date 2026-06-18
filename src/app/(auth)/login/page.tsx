import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Log in · ProBot",
  description: "Log in to manage your bot and leads.",
};

export default function LoginPage() {
  return <LoginForm />;
}
