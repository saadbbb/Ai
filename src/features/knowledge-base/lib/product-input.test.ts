import { describe, expect, it } from "vitest";
import { parseGalleryImageUrls, parseVariantNames } from "./product-input";

describe("parseGalleryImageUrls", () => {
  it("splits on newlines and trims each URL", () => {
    expect(parseGalleryImageUrls("https://a.com/1.png\n  https://a.com/2.png  \n")).toEqual([
      "https://a.com/1.png",
      "https://a.com/2.png",
    ]);
  });

  it("drops blank lines", () => {
    expect(parseGalleryImageUrls("https://a.com/1.png\n\n\nhttps://a.com/2.png")).toEqual([
      "https://a.com/1.png",
      "https://a.com/2.png",
    ]);
  });

  it("returns an empty array for undefined or blank input", () => {
    expect(parseGalleryImageUrls(undefined)).toEqual([]);
    expect(parseGalleryImageUrls("")).toEqual([]);
  });
});

describe("parseVariantNames", () => {
  it("splits on commas and trims each name", () => {
    expect(parseVariantNames("Small, Medium,  Large")).toEqual([
      { name: "Small", priceOverride: null },
      { name: "Medium", priceOverride: null },
      { name: "Large", priceOverride: null },
    ]);
  });

  it("drops empty entries from trailing commas", () => {
    expect(parseVariantNames("Red,,Blue,")).toEqual([
      { name: "Red", priceOverride: null },
      { name: "Blue", priceOverride: null },
    ]);
  });

  it("returns an empty array for undefined or blank input", () => {
    expect(parseVariantNames(undefined)).toEqual([]);
    expect(parseVariantNames("")).toEqual([]);
  });
});
