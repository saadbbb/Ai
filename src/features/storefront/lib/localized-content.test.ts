import { describe, expect, it } from "vitest";
import type { Storefront } from "@/db/schema";
import { resolveLocalizedStorefrontText } from "./localized-content";

function makeStorefront(overrides: Partial<Storefront> = {}): Storefront {
  return {
    id: "storefront-1",
    workspaceId: "workspace-1",
    isPublished: true,
    heroTitle: "Welcome",
    heroSubtitle: "Quality goods",
    aboutText: "We've been in business since 2020.",
    contactPhone: null,
    contactEmail: null,
    primaryColor: null,
    faviconUrl: null,
    bannerImageUrl: null,
    secondaryColor: null,
    font: "inter",
    buttonStyle: "rounded",
    cornerStyle: "soft",
    headerStyle: "standard",
    footerStyle: "standard",
    darkMode: false,
    theme: "modern",
    socialLinks: {},
    trackingIds: {},
    seoTitle: null,
    seoDescription: null,
    translations: {},
    sections: ["hero", "about", "products", "services", "contact"],
    privacyPolicyText: null,
    termsText: null,
    announcementBarText: null,
    announcementBarLink: null,
    popupEnabled: false,
    popupTitle: null,
    popupMessage: null,
    popupButtonText: null,
    popupButtonLink: null,
    popupTrigger: "delay",
    popupDelaySeconds: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("resolveLocalizedStorefrontText", () => {
  it("returns the default-locale columns as-is for the default locale", () => {
    const storefront = makeStorefront();

    expect(resolveLocalizedStorefrontText(storefront, "en")).toEqual({
      heroTitle: "Welcome",
      heroSubtitle: "Quality goods",
      aboutText: "We've been in business since 2020.",
    });
  });

  it("uses a non-default locale's override when one exists", () => {
    const storefront = makeStorefront({
      translations: { ar: { heroTitle: "أهلاً", heroSubtitle: "بضائع ذات جودة", aboutText: "نحن في السوق منذ 2020." } },
    });

    expect(resolveLocalizedStorefrontText(storefront, "ar")).toEqual({
      heroTitle: "أهلاً",
      heroSubtitle: "بضائع ذات جودة",
      aboutText: "نحن في السوق منذ 2020.",
    });
  });

  it("falls back to the default-locale value for any field left untranslated", () => {
    const storefront = makeStorefront({ translations: { ar: { heroTitle: "أهلاً" } } });

    expect(resolveLocalizedStorefrontText(storefront, "ar")).toEqual({
      heroTitle: "أهلاً",
      heroSubtitle: "Quality goods",
      aboutText: "We've been in business since 2020.",
    });
  });

  it("falls back entirely to the default locale when no override exists for that locale", () => {
    const storefront = makeStorefront();

    expect(resolveLocalizedStorefrontText(storefront, "ku")).toEqual({
      heroTitle: "Welcome",
      heroSubtitle: "Quality goods",
      aboutText: "We've been in business since 2020.",
    });
  });
});
