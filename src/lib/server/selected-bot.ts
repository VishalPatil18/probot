import { cookies } from "next/headers";

// Slice A: bot switcher state. The dashboard shell shows one bot at a
// time (URL pill, embed snippet, View live bot button, etc.) — the
// selected bot ID is persisted in a per-user-browser cookie so the
// selection survives page navigations AND server-rendered passes.
//
// Why a cookie and not localStorage: the sidebar + topbar are RSCs that
// need the selected bot at render time. localStorage is client-only,
// would force the shell to be a client component or to round-trip the
// value on every page. The cookie is read by `cookies()` in any RSC for
// free.
//
// Caller contract: pass a `validIds` set (the user's owned bot IDs) so
// a stale cookie pointing at a deleted bot, or a hostile cookie pointing
// at another user's bot, can't leak across the tenancy boundary. When
// the cookie value isn't in the set, we fall back to the caller's
// `fallbackId` (typically the most recently updated bot).

export const SELECTED_BOT_COOKIE = "probot.selectedBot.v1";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

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

// Server action target — invoked by <BotSwitcher> when the user picks a
// new bot from the dropdown. The action validates ownership before
// writing the cookie so a forged form payload cannot select a bot the
// user does not own.
export type SetSelectedBotResult =
  | { ok: true }
  | { ok: false; reason: "unauthorized" | "not_found" };

export function writeSelectedBotCookie(botId: string): void {
  cookies().set(SELECTED_BOT_COOKIE, botId, {
    maxAge: COOKIE_MAX_AGE_SECONDS,
    // The cookie is only ever read server-side via `cookies()`; client
    // JS has no legitimate reason to see it. Setting httpOnly stops
    // a future XSS from enumerating the user's bot IDs even though
    // the IDs are not themselves secret.
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}
