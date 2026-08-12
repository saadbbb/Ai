import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_THEME, isTheme, THEME_COOKIE_NAME, type Theme } from "./config";

/** The cookie is the fast, always-available source for every page (including logged-out ones). See resolveTheme in the root layout for why this can't also check the account here. */
export async function resolveThemeFromCookie(): Promise<Theme> {
  const cookieStore = await cookies();
  const value = cookieStore.get(THEME_COOKIE_NAME)?.value;
  return isTheme(value) ? value : DEFAULT_THEME;
}
