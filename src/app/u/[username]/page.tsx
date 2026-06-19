import { redirect } from "next/navigation";

// Stage 4 plan.md §4: /u/[username] → /u/[username]/chat.
// A bare username URL is a friendlier share format; we land everyone on the
// actual chat surface.
export default function UserBareRoute({
  params,
}: {
  params: { username: string };
}) {
  redirect(`/u/${params.username}/chat`);
}
