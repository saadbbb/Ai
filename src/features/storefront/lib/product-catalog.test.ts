import { describe, expect, it } from "vitest";
import type { Product } from "@/db/schema";
import { extractCategories, filterAndSortProducts, recommendProducts } from "./product-catalog";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-1",
    workspaceId: "workspace-1",
    name: "Widget",
    description: null,
    price: "10.00",
    discountedPrice: null,
    category: null,
    imageUrl: null,
    galleryImageUrls: [],
    variants: [],
    isActive: true,
    aiVisible: true,
    featured: false,
    promotionEndsAt: null,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("extractCategories", () => {
  it("returns unique, defined categories in first-seen order", () => {
    const products = [
      makeProduct({ category: "Shoes" }),
      makeProduct({ category: "Bags" }),
      makeProduct({ category: "Shoes" }),
      makeProduct({ category: null }),
    ];
    expect(extractCategories(products)).toEqual(["Shoes", "Bags"]);
  });

  it("returns an empty array when no product has a category", () => {
    expect(extractCategories([makeProduct(), makeProduct()])).toEqual([]);
  });
});

describe("filterAndSortProducts", () => {
  const salesCounts = new Map<string, number>();

  it("filters by search across name and description", () => {
    const products = [
      makeProduct({ id: "1", name: "Blue Shirt" }),
      makeProduct({ id: "2", name: "Red Hat", description: "A blue-trimmed cap" }),
      makeProduct({ id: "3", name: "Green Socks" }),
    ];
    const result = filterAndSortProducts(products, { search: "blue" }, salesCounts);
    expect(result.map((p) => p.id)).toEqual(["1", "2"]);
  });

  it("filters by category", () => {
    const products = [makeProduct({ id: "1", category: "Shoes" }), makeProduct({ id: "2", category: "Bags" })];
    const result = filterAndSortProducts(products, { category: "Shoes" }, salesCounts);
    expect(result.map((p) => p.id)).toEqual(["1"]);
  });

  it("keeps only discounted products when sort is 'discounted'", () => {
    const products = [
      makeProduct({ id: "1", discountedPrice: "8.00" }),
      makeProduct({ id: "2", discountedPrice: null }),
    ];
    const result = filterAndSortProducts(products, { sort: "discounted" }, salesCounts);
    expect(result.map((p) => p.id)).toEqual(["1"]);
  });

  it("sorts by price ascending using the discounted price when set", () => {
    const products = [
      makeProduct({ id: "1", price: "30.00" }),
      makeProduct({ id: "2", price: "50.00", discountedPrice: "5.00" }),
      makeProduct({ id: "3", price: "10.00" }),
    ];
    const result = filterAndSortProducts(products, { sort: "price_asc" }, salesCounts);
    expect(result.map((p) => p.id)).toEqual(["2", "3", "1"]);
  });

  it("sorts by price descending", () => {
    const products = [makeProduct({ id: "1", price: "10.00" }), makeProduct({ id: "2", price: "30.00" })];
    const result = filterAndSortProducts(products, { sort: "price_desc" }, salesCounts);
    expect(result.map((p) => p.id)).toEqual(["2", "1"]);
  });

  it("sorts by best-selling using the provided sales counts", () => {
    const products = [makeProduct({ id: "1" }), makeProduct({ id: "2" }), makeProduct({ id: "3" })];
    const counts = new Map([["2", 50], ["3", 10]]);
    const result = filterAndSortProducts(products, { sort: "best_selling" }, counts);
    expect(result.map((p) => p.id)).toEqual(["2", "3", "1"]);
  });

  it("defaults to newest-first", () => {
    const products = [
      makeProduct({ id: "1", createdAt: new Date("2026-01-01") }),
      makeProduct({ id: "2", createdAt: new Date("2026-03-01") }),
    ];
    const result = filterAndSortProducts(products, {}, salesCounts);
    expect(result.map((p) => p.id)).toEqual(["2", "1"]);
  });
});

describe("recommendProducts", () => {
  it("prioritizes same-category products over best-sellers", () => {
    const products = [
      makeProduct({ id: "current", category: "Shoes" }),
      makeProduct({ id: "same-cat", category: "Shoes" }),
      makeProduct({ id: "best-seller", category: "Bags" }),
    ];
    const salesCounts = new Map([["best-seller", 100]]);

    const result = recommendProducts(products, "current", "Shoes", salesCounts);

    expect(result.map((p) => p.id)).toEqual(["same-cat", "best-seller"]);
  });

  it("excludes the current product itself", () => {
    const products = [makeProduct({ id: "current" }), makeProduct({ id: "other" })];
    const result = recommendProducts(products, "current", null, new Map());
    expect(result.map((p) => p.id)).toEqual(["other"]);
  });

  it("excludes inactive products", () => {
    const products = [makeProduct({ id: "current" }), makeProduct({ id: "inactive", isActive: false })];
    const result = recommendProducts(products, "current", null, new Map());
    expect(result).toEqual([]);
  });

  it("falls back entirely to best-sellers when there's no category", () => {
    const products = [makeProduct({ id: "current" }), makeProduct({ id: "a" }), makeProduct({ id: "b" })];
    const salesCounts = new Map([["b", 5], ["a", 1]]);

    const result = recommendProducts(products, "current", null, salesCounts);

    expect(result.map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("respects the limit", () => {
    const products = Array.from({ length: 5 }, (_, i) => makeProduct({ id: `p${i}` }));
    const result = recommendProducts(products, "nonexistent", null, new Map(), 2);
    expect(result).toHaveLength(2);
  });
});
