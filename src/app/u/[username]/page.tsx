import { redirect } from "next/navigation";

// /u/[username] → /u/[username]/chat.
// A bare username URL is a friendlier share format; we land everyone on the
// actual chat surface.
export default function UserBareRoute({
  params,
}: {
  params: { username: string };
}) {
  redirect(`/u/${params.username}/chat`);
}
