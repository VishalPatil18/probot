import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth/auth";

import { RegisterSelfHostedForm } from "./RegisterSelfHostedForm";

export const metadata = {
  title: "Register a self-hosted bot · ProBot",
};

export default async function NewSelfHostedBotPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/bots/new-self-hosted");
  }

  return (
    <div className="flex flex-col lg:h-full lg:overflow-hidden">
      <div className="w-full max-w-[1280px] mx-auto lg:flex-1 lg:min-h-0">
        <div className="px-6 lg:px-12 py-10 lg:overflow-y-auto">
          <div className="max-w-lg">
            <RegisterSelfHostedForm />
          </div>
        </div>
      </div>
    </div>
  );
}
