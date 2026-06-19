// Stage 1.5 auto-generates `user-<8hex>` placeholder usernames for OAuth and
// magic-link sign-ups so `users.username NOT NULL UNIQUE` is satisfied for
// every adapter path. Stage 4 forces these users through an onboarding
// screen before they reach the dashboard (otherwise public chat URLs would
// look like `/u/user-abc12345/chat`).
//
// Single source of truth for "is this a placeholder?" — the dashboard
// layout, the /onboarding page, and the onboarding PATCH route all call
// this same predicate.

const PLACEHOLDER_REGEX = /^user-[0-9a-f]{8}$/;

export function isPlaceholderUsername(username: string): boolean {
  return PLACEHOLDER_REGEX.test(username);
}
