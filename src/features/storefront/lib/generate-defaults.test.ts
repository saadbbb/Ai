import { describe, expect, it } from "vitest";
import { defaultSectionsForBusinessType, generateHeroDefaults } from "./generate-defaults";

describe("generateHeroDefaults", () => {
  it("picks a booking CTA for a clinic, in the workspace's own language", () => {
    const result = generateHeroDefaults(
      { name: "Sunrise Clinic", businessType: "clinic", language: "ar" },
      { businessDescription: "Family medicine for the whole neighborhood." },
    );

    expect(result).toEqual({
      heroTitle: "Sunrise Clinic",
      heroSubtitle: "Family medicine for the whole neighborhood.",
      heroCtaLabel: "احجز موعدك",
      heroCtaLink: "#contact",
    });
  });

  it("picks a shop-now CTA linking to /products for a store-like business type", () => {
    const result = generateHeroDefaults({ name: "Nora's Shop", businessType: "localStore", language: "en" }, null);

    expect(result.heroCtaLabel).toBe("Shop now");
    expect(result.heroCtaLink).toBe("/products");
  });

  it("falls back to the generic archetype for an unrecognized or missing business type", () => {
    const result = generateHeroDefaults({ name: "Something", businessType: null, language: "en" }, null);

    expect(result.heroCtaLabel).toBe("Contact us");
  });

  it("never invents a subtitle when there's no AI business description", () => {
    const result = generateHeroDefaults({ name: "Something", businessType: "restaurant", language: "en" }, null);

    expect(result.heroSubtitle).toBeNull();
  });
});

describe("defaultSectionsForBusinessType", () => {
  it("orders products before services for a store archetype", () => {
    const sections = defaultSectionsForBusinessType("instagramShop");
    expect(sections.indexOf("products")).toBeLessThan(sections.indexOf("contact"));
    expect(sections).toContain("hero");
    expect(sections).toContain("contact");
  });

  it("orders services first for a clinic archetype", () => {
    const sections = defaultSectionsForBusinessType("medicalCenter");
    expect(sections[0]).toBe("hero");
    expect(sections[1]).toBe("services");
  });

  it("falls back to the generic section order for an unknown business type", () => {
    expect(defaultSectionsForBusinessType("something-unheard-of")).toEqual(defaultSectionsForBusinessType(null));
  });
});
