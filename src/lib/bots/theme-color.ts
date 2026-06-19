import { z } from "zod";

// Stage 5: per-bot theme color used by the embeddable widget (and the
// signature badge). Stored as `#RRGGBB` so it fits a `varchar(7)` column
// exactly. Single source of truth for the validator + default — used by the
// bot Zod schema, the PATCH route, and the widget's fallback path.

export const DEFAULT_THEME_COLOR = "#7c5cff";

// `#RRGGBB` only — short-form `#FFF` is rejected so the column is always 7
// chars and the widget never has to expand a shorthand at render time.
export const THEME_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export const themeColorSchema = z
  .string()
  .regex(THEME_COLOR_REGEX, "Theme color must be a 6-digit hex code like #7c5cff");

export function isValidThemeColor(value: string): boolean {
  return THEME_COLOR_REGEX.test(value);
}
