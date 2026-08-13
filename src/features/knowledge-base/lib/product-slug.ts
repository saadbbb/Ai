/**
 * Auto-generates a product slug/SKU so the user is never asked for either
 * (spec: "لا تجبر المستخدم على إدخاله"). Falls back to a short random suffix
 * when the name strips to nothing — common for Arabic-only product names,
 * since this ASCII slugify (same convention as blog.service.ts's) can't
 * transliterate non-Latin scripts.
 */
export function slugifyProductName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || `product-${Math.random().toString(36).slice(2, 8)}`;
}

export function uniqueProductSlug(base: string, existingSlugs: Iterable<string>): string {
  const taken = new Set(existingSlugs);
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

/** Sequential per-workspace label, not a strict inventory identifier — good enough for "a friendly reference", not meant to survive deletions gaplessly. */
export function generateProductSku(existingProductCount: number): string {
  return `PRD-${String(existingProductCount + 1).padStart(4, "0")}`;
}
