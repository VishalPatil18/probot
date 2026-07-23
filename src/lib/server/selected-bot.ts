import { cookies } from "next/headers";

export const SELECTED_BOT_COOKIE = "probot.selectedBot.v1";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function resolveSelectedBotId(
  validIds: ReadonlyArray<string>,
  fallbackId: string | null,
): string | null {
  if (validIds.length === 0) return null;
  const cookieValue = cookies().get(SELECTED_BOT_COOKIE)?.value ?? null;
  if (cookieValue && validIds.includes(cookieValue)) {
    return cookieValue;
  }
  return fallbackId ?? validIds[0] ?? null;
}

export type SetSelectedBotResult =
  | { ok: true }
  | { ok: false; reason: "unauthorized" | "not_found" };

export function writeSelectedBotCookie(botId: string): void {
  cookies().set(SELECTED_BOT_COOKIE, botId, {
    maxAge: COOKIE_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}
