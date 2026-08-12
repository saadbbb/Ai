"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Dark is the app's fixed base look (see globals.css) — enableSystem is
 * deliberately false so the OS/browser color-scheme preference never silently
 * overrides it (that silent override, combined with an orphaned useTheme()
 * call in sonner.tsx with no provider above it, was the Android-vs-iPhone
 * dark-mode inconsistency bug: toasts specifically followed the device's
 * preference instead of the app's). Light mode is only ever reached through
 * an explicit user toggle. enableColorScheme (on by default) makes
 * next-themes stamp the resolved theme onto <html style="color-scheme">
 * itself before paint, so native form chrome/scrollbars follow OUR choice
 * instead of iOS Safari's own light-mode fallback.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false} enableColorScheme {...props}>
      {children}
    </NextThemesProvider>
  );
}
