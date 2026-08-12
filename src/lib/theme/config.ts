import type { Theme } from "@/db/schema";

export type { Theme };

export const THEME_COOKIE_NAME = "theme";
export const DEFAULT_THEME: Theme = "dark";

export function isTheme(value: string | undefined | null): value is Theme {
  return value === "dark" || value === "light";
}
