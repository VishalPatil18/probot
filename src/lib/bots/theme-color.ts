import { z } from "zod";

export const DEFAULT_THEME_COLOR = "#7c5cff";

export const THEME_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export const themeColorSchema = z
  .string()
  .regex(
    THEME_COLOR_REGEX,
    "Theme color must be a 6-digit hex code like #7c5cff",
  );

export function isValidThemeColor(value: string): boolean {
  return THEME_COLOR_REGEX.test(value);
}
