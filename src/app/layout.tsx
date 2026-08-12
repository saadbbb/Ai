import type { Metadata } from "next";
import { Cairo, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { dirFor } from "@/i18n/config";
import { resolveThemeFromCookie } from "@/lib/theme/resolve";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  return {
    title: t("name"),
    description: t("tagline"),
  };
}

/**
 * Every page's HTML depends on the NEXT_LOCALE/theme cookies (see
 * src/i18n/request.ts and below). Pages that don't also read the session
 * cookie (the public auth pages) don't get Next's strong no-store
 * cache-control by default, so Vercel's edge was caching one visitor's
 * locale/theme and serving it publicly to everyone else. Forcing dynamic
 * rendering everywhere guarantees every response is private and correct.
 */
export const dynamic = "force-dynamic";

/**
 * Theme resolution (2026-08-12 rewrite): dark is the fixed default, light is
 * an explicit opt-in — never the OS/browser's prefers-color-scheme. Resolved
 * server-side from a cookie (fast, works for every visitor including logged-
 * out ones) so the correct class and `color-scheme` are present in the very
 * first byte of HTML, before any JS runs. This isn't just for FOUC — Android
 * Chrome's "Auto Dark Theme for Web Contents" algorithmically re-darkens
 * pages that don't declare their color-scheme in the initial server response
 * (a JS-only fix, e.g. next-themes' old localStorage approach, runs too late
 * for it), which was the actual root cause of the Android-only bug report.
 *
 * For a logged-in user, dashboard/onboarding layouts additionally reconcile
 * this cookie against users.theme (the account-level, cross-device source of
 * truth) client-side on mount — see components/theme-sync.tsx — since this
 * root layout has no user context of its own and must stay fast for every
 * public page (marketing, storefronts) that never call requireUser().
 *
 * `only <scheme>` (not just `<scheme>`) is deliberate — plain `color-scheme:
 * dark` still lets some Android OEM browsers/WebViews (Samsung One UI,
 * MIUI, etc., and some Chrome versions' "Force Dark") apply their own
 * darkening on top when the device's system dark mode is on, regardless of
 * what the page already declares. `only` is the CSS Color Adjustment spec's
 * explicit "do not adapt this document to any other color scheme, under any
 * circumstance" signal — the strongest opt-out available, rendered directly
 * as a <meta> tag here rather than via generateViewport() because Next's
 * typed Viewport.colorScheme doesn't include "only dark" as a value.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const theme = await resolveThemeFromCookie();
  const colorScheme = `only ${theme}`;

  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`${jakarta.variable} ${geistMono.variable} ${cairo.variable} h-full antialiased ${theme === "light" ? "light" : ""}`}
      style={{ colorScheme }}
    >
      <head>
        <meta name="color-scheme" content={colorScheme} />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <TooltipProvider delayDuration={300}>
            {children}
            <Toaster theme={theme} />
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
