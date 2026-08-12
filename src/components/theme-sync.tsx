"use client";

import { useEffect } from "react";
import { THEME_COOKIE_NAME, type Theme } from "@/lib/theme/config";

/**
 * Cross-device correction: the account's stored theme (users.theme, passed
 * in here from a server layout that already called requireUser()) is the
 * source of truth, but the very first page load on a brand-new device has
 * no cookie for it yet, and the root layout renders before it knows the
 * user. This runs once, immediately on mount, and silently fixes the <html>
 * class + this device's cookie if they don't already match the account —
 * every later load on this same device is then correct from the root layout
 * alone, with no client-side correction needed.
 */
export function ThemeSync({ accountTheme }: { accountTheme: Theme }) {
  useEffect(() => {
    const root = document.documentElement;
    const currentlyLight = root.classList.contains("light");
    const shouldBeLight = accountTheme === "light";
    if (currentlyLight === shouldBeLight) return;

    root.classList.toggle("light", shouldBeLight);
    root.style.colorScheme = accountTheme;
    document.cookie = `${THEME_COOKIE_NAME}=${accountTheme}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }, [accountTheme]);

  return null;
}
