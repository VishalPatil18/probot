import { redirect } from "next/navigation";

export default function UserBareRoute({
  params,
}: {
  params: { username: string };
}) {
  redirect(`/u/${params.username}/chat`);
}
