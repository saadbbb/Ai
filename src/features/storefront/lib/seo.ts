import "server-only";
import type { Metadata } from "next";
import type { Storefront } from "@/db/schema";
import { getAppUrl } from "@/lib/env";

interface BuildStorefrontMetadataInput {
  slug: string;
  path?: string;
  workspaceName: string;
  storefront: Storefront;
  title: string;
  description?: string;
  imageUrl?: string | null;
  noIndex?: boolean;
}

/** Shared OG/Twitter/canonical shape for every /store/[slug]/* page — SEO depth (PART 13 gap #141). */
export function buildStorefrontMetadata({
  slug,
  path = "",
  workspaceName,
  storefront,
  title,
  description,
  imageUrl,
  noIndex,
}: BuildStorefrontMetadataInput): Metadata {
  const url = `${getAppUrl()}/store/${slug}${path}`;
  const image = imageUrl || storefront.bannerImageUrl || undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    ...(noIndex ? { robots: { index: false, follow: true } } : undefined),
    openGraph: {
      type: "website",
      url,
      siteName: workspaceName,
      title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
    icons: storefront.faviconUrl ? { icon: storefront.faviconUrl } : undefined,
  };
}
