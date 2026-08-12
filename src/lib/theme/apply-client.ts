import { THEME_COOKIE_NAME, type Theme } from "./config";

/**
 * The one place that mutates <html> for a theme change on the client —
 * used by both the instant toggle (theme-toggle.tsx) and the cross-device
 * correction (theme-sync.tsx). Also writes the cookie directly (no server
 * round-trip needed just for this device to render correctly next load).
 */
export function applyThemeToDocument(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = `only ${theme}`;
  document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}
