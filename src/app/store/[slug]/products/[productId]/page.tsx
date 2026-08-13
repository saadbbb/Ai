import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { AddToCartButton } from "@/features/storefront/components/add-to-cart-button";
import { InquiryForm } from "@/features/storefront/components/inquiry-form";
import { ShareButton } from "@/features/storefront/components/share-button";
import { StorefrontShell } from "@/features/storefront/components/storefront-shell";
import { getStorefrontData } from "@/features/storefront/lib/get-storefront-data";
import { recommendProducts } from "@/features/storefront/lib/product-catalog";
import { buildStorefrontMetadata } from "@/features/storefront/lib/seo";
import { storefrontRepository } from "@/features/storefront/repository/storefront.repository";
import { storefrontAnalyticsService } from "@/features/storefront/services/storefront-analytics.service";
import { productRepository } from "@/features/knowledge-base/repository/product.repository";
import { orderRepository } from "@/features/orders/repository/order.repository";
import { getAppUrl } from "@/lib/env";

interface PageProps {
  params: Promise<{ slug: string; productId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, productId } = await params;
  const row = await storefrontRepository.findPublishedByWorkspaceSlug(slug);
  if (!row) return {};
  const product = await productRepository.findById(productId, row.workspaceId);
  if (!product) return {};
  return buildStorefrontMetadata({
    slug,
    path: `/products/${product.id}`,
    workspaceName: row.workspaceName,
    storefront: row.storefront,
    title: `${product.name} — ${row.workspaceName}`,
    description: product.description ?? undefined,
    imageUrl: product.imageUrl,
  });
}

export default async function StoreProductPage({ params }: PageProps) {
  const { slug, productId } = await params;
  const t = await getTranslations("website.public");
  const { storefront, workspaceId, workspaceName, logoUrl } = await getStorefrontData(slug);

  const product = await productRepository.findById(productId, workspaceId);
  if (!product || !product.isActive) notFound();

  await storefrontAnalyticsService.trackProductView(workspaceId, product.id);

  const [allProducts, salesCounts] = await Promise.all([
    productRepository.findByWorkspaceId(workspaceId),
    orderRepository.sumQuantityByProductId(workspaceId),
  ]);
  const related = recommendProducts(allProducts, product.id, product.category, salesCounts);

  const accentColor = storefront.primaryColor && /^#[0-9a-fA-F]{6}$/.test(storefront.primaryColor) ? storefront.primaryColor : "#2563eb";
  const gallery = [product.imageUrl, ...product.galleryImageUrls].filter((url): url is string => !!url);
  const productUrl = `${getAppUrl()}/store/${slug}/products/${product.id}`;
  const whatsappNumber = storefront.socialLinks.whatsapp;
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(t("whatsappMessage", { product: product.name }))}`
    : null;

  const price = product.discountedPrice ?? product.price;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.description ? { description: product.description } : undefined),
    ...(product.imageUrl ? { image: [product.imageUrl, ...product.galleryImageUrls] } : undefined),
    ...(product.category ? { category: product.category } : undefined),
    ...(price
      ? {
          offers: {
            "@type": "Offer",
            url: productUrl,
            price,
            priceCurrency: "IQD",
            availability: "https://schema.org/InStock",
          },
        }
      : undefined),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <StorefrontShell storefront={storefront} workspaceName={workspaceName} logoUrl={logoUrl} slug={slug}>
        <div className="mx-auto max-w-4xl space-y-8 px-6 py-12">
          <Link href={`/store/${slug}/products`} className="text-sm text-muted-foreground hover:text-foreground">
            {t("backToProducts")}
          </Link>

          <div className="grid gap-8 sm:grid-cols-2">
            <div className="space-y-2">
              {gallery.length > 0 ? (
                <>
                  <Image
                    src={gallery[0]}
                    alt={product.name}
                    width={600}
                    height={600}
                    sizes="(max-width: 640px) 100vw, 50vw"
                    priority
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                  {gallery.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {gallery.slice(1).map((url) => (
                        <Image
                          key={url}
                          src={url}
                          alt=""
                          width={150}
                          height={150}
                          sizes="25vw"
                          className="aspect-square w-full rounded object-cover"
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="aspect-square w-full rounded-lg bg-muted" />
              )}
            </div>

            <div className="space-y-4">
              {product.category && <p className="text-xs text-muted-foreground">{product.category}</p>}
              <h1 className="text-2xl font-semibold">{product.name}</h1>
              <div className="flex items-center gap-2">
                {product.discountedPrice ? (
                  <>
                    <p className="text-xl font-medium" style={{ color: accentColor }}>
                      {product.discountedPrice}
                    </p>
                    <p className="text-sm text-muted-foreground line-through">{product.price}</p>
                  </>
                ) : (
                  product.price && (
                    <p className="text-xl font-medium" style={{ color: accentColor }}>
                      {product.price}
                    </p>
                  )
                )}
              </div>
              {product.description && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{product.description}</p>}

              {product.variants.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t("variantsLabel")}</p>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((variant) => (
                      <span key={variant.name} className="rounded-full bg-muted px-2 py-1 text-xs">
                        {variant.name}
                        {variant.priceOverride ? ` — ${variant.priceOverride}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <AddToCartButton
                  productId={product.id}
                  name={product.name}
                  unitPrice={product.discountedPrice ?? product.price ?? "0"}
                />
                <ShareButton title={product.name} url={productUrl} />
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center rounded-md border px-4 text-sm hover:bg-muted"
                  >
                    {t("askOnWhatsapp")}
                  </a>
                )}
              </div>

              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium">{t("interestedHeading")}</p>
                <InquiryForm slug={slug} initialMessage={t("interestedMessage", { product: product.name })} />
              </div>
            </div>
          </div>

          {related.length > 0 && (
            <section className="space-y-3 border-t pt-8">
              <h2 className="text-lg font-medium">{t("relatedHeading")}</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {related.map((item) => (
                  <Link key={item.id} href={`/store/${slug}/products/${item.id}`}>
                    <Card className="h-full transition-shadow hover:shadow-md">
                      {item.imageUrl && (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          width={300}
                          height={240}
                          sizes="(max-width: 640px) 100vw, 33vw"
                          className="h-32 w-full rounded-t-lg object-cover"
                        />
                      )}
                      <CardContent className="space-y-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        {item.price && <p className="text-xs text-muted-foreground">{item.price}</p>}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </StorefrontShell>
    </>
  );
}
