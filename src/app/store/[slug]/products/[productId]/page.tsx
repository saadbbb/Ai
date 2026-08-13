import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InquiryForm } from "@/features/storefront/components/inquiry-form";
import { CartControl, ProductCard } from "@/features/storefront/components/product-card";
import { ProductViewTracker } from "@/features/storefront/components/product-view-tracker";
import { ShareButton } from "@/features/storefront/components/share-button";
import { StorefrontShell } from "@/features/storefront/components/storefront-shell";
import { getStorefrontData } from "@/features/storefront/lib/get-storefront-data";
import { recommendProducts } from "@/features/storefront/lib/product-catalog";
import { buildStorefrontMetadata } from "@/features/storefront/lib/seo";
import { storefrontButtonClass, storefrontCornerClass } from "@/features/storefront/lib/style-classes";
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
    fallbackImageUrl: row.logoUrl,
  });
}

export default async function StoreProductPage({ params }: PageProps) {
  const { slug, productId } = await params;
  const t = await getTranslations("website.public");
  const { storefront, workspaceId, workspaceName, logoUrl } = await getStorefrontData(slug);

  const product = await productRepository.findById(productId, workspaceId);
  if (!product || !product.isActive) notFound();
  const outOfStock = product.trackQuantity && (product.quantity ?? 0) <= 0;

  await storefrontAnalyticsService.trackProductView(workspaceId, product.id);

  const [allProducts, salesCounts] = await Promise.all([
    productRepository.findByWorkspaceId(workspaceId),
    orderRepository.sumQuantityByProductId(workspaceId),
  ]);
  const related = recommendProducts(allProducts, product.id, product.category, salesCounts);

  const accentColor = storefront.primaryColor && /^#[0-9a-fA-F]{6}$/.test(storefront.primaryColor) ? storefront.primaryColor : "#2563eb";
  const secondaryColor = storefront.secondaryColor && /^#[0-9a-fA-F]{6}$/.test(storefront.secondaryColor) ? storefront.secondaryColor : "#f97316";
  const cornerClass = storefrontCornerClass(storefront);
  const buttonClass = storefrontButtonClass(storefront);
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
            availability: outOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
          },
        }
      : undefined),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ProductViewTracker productName={product.name} price={price} />
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
                {outOfStock && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {t("outOfStock")}
                  </span>
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

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <CartControl product={product} buttonClass={buttonClass} />
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
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                {related.map((item) => (
                  <ProductCard
                    key={item.id}
                    slug={slug}
                    product={item}
                    mode="grid"
                    size="sm"
                    accentColor={accentColor}
                    secondaryColor={secondaryColor}
                    cornerClass={cornerClass}
                    buttonClass={buttonClass}
                    showDescription={storefront.showProductDescription}
                    showComparePrice={storefront.showComparePrice}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </StorefrontShell>
    </>
  );
}
