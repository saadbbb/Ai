import type { Storefront } from "@/db/schema";
import { DEFAULT_LOCALE } from "@/i18n/config";

interface LocalizedStorefrontText {
  heroTitle: string | null;
  heroSubtitle: string | null;
  aboutText: string | null;
}

/**
 * Multi-language storefront content (PART 13 gap #145) — resolves the
 * default-locale columns plus this locale's override from `translations`,
 * falling back to the default-locale value for any field left blank in the
 * override (a partial translation is still useful, not an error state).
 */
export function resolveLocalizedStorefrontText(storefront: Storefront, locale: string): LocalizedStorefrontText {
  if (locale === DEFAULT_LOCALE) {
    return { heroTitle: storefront.heroTitle, heroSubtitle: storefront.heroSubtitle, aboutText: storefront.aboutText };
  }

  const override = storefront.translations[locale];
  return {
    heroTitle: override?.heroTitle || storefront.heroTitle,
    heroSubtitle: override?.heroSubtitle || storefront.heroSubtitle,
    aboutText: override?.aboutText || storefront.aboutText,
  };
}
