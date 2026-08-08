import type { MetadataRoute } from "next";
import { productRepository } from "@/features/knowledge-base/repository/product.repository";
import { blogPostRepository } from "@/features/storefront/repository/blog-post.repository";
import { storefrontRepository } from "@/features/storefront/repository/storefront.repository";
import { getAppUrl } from "@/lib/env";

export const revalidate = 3600;

/**
 * SEO depth (PART 13 gap #141) — one sitemap covering every published
 * tenant storefront and its active products. Storefronts and their catalogs
 * are small enough in practice that a single non-paginated sitemap is the
 * right scope; a sitemap index would only be worth the complexity past
 * Next's 50,000-URL-per-file limit.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = getAppUrl();
  const stores = await storefrontRepository.findAllPublished();

  const entries: MetadataRoute.Sitemap = [];

  for (const store of stores) {
    const base = `${appUrl}/store/${store.slug}`;
    entries.push(
      { url: base, lastModified: store.updatedAt, changeFrequency: "daily", priority: 1 },
      { url: `${base}/products`, lastModified: store.updatedAt, changeFrequency: "daily", priority: 0.8 },
      { url: `${base}/about`, lastModified: store.updatedAt, changeFrequency: "monthly", priority: 0.5 },
      { url: `${base}/blog`, lastModified: store.updatedAt, changeFrequency: "weekly", priority: 0.6 },
      { url: `${base}/faq`, lastModified: store.updatedAt, changeFrequency: "monthly", priority: 0.4 },
      { url: `${base}/contact`, lastModified: store.updatedAt, changeFrequency: "monthly", priority: 0.5 },
    );

    const products = await productRepository.findByWorkspaceId(store.workspaceId);
    for (const product of products) {
      if (!product.isActive) continue;
      entries.push({
        url: `${base}/products/${product.id}`,
        lastModified: product.createdAt,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    const posts = await blogPostRepository.findPublishedByWorkspaceId(store.workspaceId);
    for (const post of posts) {
      entries.push({
        url: `${base}/blog/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  }

  return entries;
}
