import "server-only";
import type { AiAgent, Workspace } from "@/db/schema";

/**
 * `workspace.businessType` is a closed set of onboarding keys (see
 * `BUSINESS_TYPE_KEYS` in `src/features/onboarding/constants.ts`), not free
 * text — so this is a direct lookup table, not keyword guessing.
 */
type Archetype = "store" | "clinic" | "restaurant" | "services" | "generic";

const ARCHETYPE_BY_BUSINESS_TYPE: Record<string, Archetype> = {
  smallBusiness: "generic",
  clinic: "clinic",
  restaurant: "restaurant",
  realEstate: "services",
  carDealer: "store",
  beautyCenter: "clinic",
  medicalCenter: "clinic",
  lawFirm: "services",
  educationalCenter: "services",
  instagramShop: "store",
  homeBusiness: "store",
  localStore: "store",
  other: "generic",
};

type Locale = "en" | "ar" | "ku";

const CTA_BY_ARCHETYPE: Record<Archetype, { label: Record<Locale, string>; link: string }> = {
  store: { label: { en: "Shop now", ar: "تسوق الآن", ku: "ئێستا بکڕە" }, link: "/products" },
  clinic: { label: { en: "Book your appointment", ar: "احجز موعدك", ku: "کاتی خۆت حجز بکە" }, link: "#contact" },
  restaurant: { label: { en: "Order now", ar: "اطلب الآن", ku: "ئێستا داوا بکە" }, link: "#contact" },
  services: { label: { en: "Request a quote", ar: "اطلب عرض سعر", ku: "داواکاری نرخ بکە" }, link: "#contact" },
  generic: { label: { en: "Contact us", ar: "تواصل معنا", ku: "پەیوەندیمان پێوە بکە" }, link: "#contact" },
};

/**
 * Only sections that already exist on the storefront (`ALL_SECTION_KEYS` in
 * storefront-editor.tsx) — no new "Team"/"Gallery" sections here, those would
 * need new data models this pass deliberately doesn't add. Home-page render
 * already hides any section with no backing data, so listing "services" for
 * a business with none configured yet is harmless, not a broken empty block.
 */
const SECTIONS_BY_ARCHETYPE: Record<Archetype, string[]> = {
  store: ["hero", "products", "featured", "testimonials", "contact"],
  clinic: ["hero", "services", "about", "testimonials", "contact"],
  restaurant: ["hero", "products", "about", "testimonials", "contact"],
  services: ["hero", "services", "about", "testimonials", "contact"],
  generic: ["hero", "about", "products", "services", "testimonials", "contact"],
};

function archetypeFor(businessType: string | null): Archetype {
  if (!businessType) return "generic";
  return ARCHETYPE_BY_BUSINESS_TYPE[businessType] ?? "generic";
}

export function defaultSectionsForBusinessType(businessType: string | null): string[] {
  return SECTIONS_BY_ARCHETYPE[archetypeFor(businessType)];
}

export interface HeroDefaults {
  heroTitle: string;
  heroSubtitle: string | null;
  heroCtaLabel: string;
  heroCtaLink: string;
}

/**
 * Fills the hero from data the system already has (business name + AI
 * agent's business description) — never invents a headline from nothing, and
 * never overwrites a value the owner already edited (callers only apply
 * this to empty fields, see storefront.service.ts).
 */
export function generateHeroDefaults(
  workspace: Pick<Workspace, "name" | "businessType" | "language">,
  aiAgent: Pick<AiAgent, "businessDescription"> | null,
): HeroDefaults {
  const archetype = archetypeFor(workspace.businessType);
  const locale: Locale = workspace.language === "en" || workspace.language === "ku" ? workspace.language : "ar";
  const cta = CTA_BY_ARCHETYPE[archetype];

  return {
    heroTitle: workspace.name,
    heroSubtitle: aiAgent?.businessDescription?.trim() || null,
    heroCtaLabel: cta.label[locale],
    heroCtaLink: cta.link,
  };
}
