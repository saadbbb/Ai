import type { ProductVariant } from "@/db/schema";

/** One URL per line, blank lines dropped — the raw-text convention documented on products.galleryImageUrls. */
export function parseGalleryImageUrls(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Comma-separated option names, e.g. "Small, Medium, Large" — no per-variant price override from this input. */
export function parseVariantNames(text: string | undefined): ProductVariant[] {
  if (!text) return [];
  return text
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name, priceOverride: null }));
}
