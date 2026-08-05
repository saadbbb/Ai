export type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

export const LOCALES = ["en", "ar", "ku"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

const RTL_LOCALES: readonly Locale[] = ["ar", "ku"];

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function isRtl(locale: string): boolean {
  return (RTL_LOCALES as readonly string[]).includes(locale);
}

export function dirFor(locale: string): "rtl" | "ltr" {
  return isRtl(locale) ? "rtl" : "ltr";
}
