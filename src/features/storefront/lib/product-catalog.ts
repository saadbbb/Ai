import type { Product, StorefrontProductDisplayMode } from "@/db/schema";

export type ProductSort = "newest" | "price_asc" | "price_desc" | "best_selling" | "discounted";

/** Wrapping container className for a `ProductCard` grid, shared by every catalog call site so the 3 display modes stay visually consistent. */
export function productGridClass(mode: StorefrontProductDisplayMode): string {
  switch (mode) {
    case "list":
      return "flex flex-col gap-2";
    case "full":
      return "flex flex-col gap-4";
    case "grid":
    default:
      return "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4";
  }
}

export interface CatalogFilters {
  search?: string;
  category?: string;
  sort?: ProductSort;
}

function effectivePrice(product: Product): number {
  const price = product.discountedPrice ?? product.price;
  return price ? Number.parseFloat(price) : 0;
}

/** Unique, defined categories in first-seen order — feeds the storefront's category filter dropdown. */
export function extractCategories(products: Product[]): string[] {
  const seen = new Set<string>();
  for (const product of products) {
    if (product.category) seen.add(product.category);
  }
  return [...seen];
}

/**
 * Search + category + "discounted only" filtering, then one of five sorts
 * (PART 13's Search & Filtering / Product Display gaps — "availability" isn't
 * included since there's no inventory/stock concept anywhere in this schema
 * yet, so it would have nothing real to filter on).
 */
export function filterAndSortProducts(
  products: Product[],
  filters: CatalogFilters,
  salesCounts: Map<string, number>,
): Product[] {
  let result = products;

  const query = filters.search?.trim().toLowerCase();
  if (query) {
    result = result.filter(
      (product) => product.name.toLowerCase().includes(query) || (product.description ?? "").toLowerCase().includes(query),
    );
  }

  if (filters.category) {
    result = result.filter((product) => product.category === filters.category);
  }

  if (filters.sort === "discounted") {
    result = result.filter((product) => product.discountedPrice !== null);
  }

  const sorted = [...result];
  switch (filters.sort) {
    case "price_asc":
      sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b));
      break;
    case "price_desc":
      sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a));
      break;
    case "best_selling":
      sorted.sort((a, b) => (salesCounts.get(b.id) ?? 0) - (salesCounts.get(a.id) ?? 0));
      break;
    case "newest":
    case "discounted":
    default:
      sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  return sorted;
}

/**
 * Smart Product Recommendations (PART 13 gap #137), kept deterministic and
 * explainable rather than a fake "AI" call — same reasoning as
 * lead-score.ts/churn-risk.ts elsewhere in this app. Prioritizes same-category
 * products (the strongest real signal available without a purchase-history
 * model per visitor), then tops up with best-sellers so the section is never
 * sparse just because a product has no category set.
 */
export function recommendProducts(
  allProducts: Product[],
  currentProductId: string,
  currentCategory: string | null,
  salesCounts: Map<string, number>,
  limit = 3,
): Product[] {
  const candidates = allProducts.filter((product) => product.isActive && product.id !== currentProductId);
  const sameCategory = currentCategory ? candidates.filter((product) => product.category === currentCategory) : [];
  const bestSellers = [...candidates]
    .filter((product) => !sameCategory.includes(product))
    .sort((a, b) => (salesCounts.get(b.id) ?? 0) - (salesCounts.get(a.id) ?? 0));

  return [...sameCategory, ...bestSellers].slice(0, limit);
}
