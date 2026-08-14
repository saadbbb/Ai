import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { ProductCard } from "@/features/storefront/components/product-card";
import { ProductFilters } from "@/features/storefront/components/product-filters";
import { StorefrontShell } from "@/features/storefront/components/storefront-shell";
import { getStorefrontData } from "@/features/storefront/lib/get-storefront-data";
import {
  extractCategories,
  filterAndSortProducts,
  productGridClass,
  shouldShowSearch,
  SORT_OPTIONS,
  type ProductSort,
} from "@/features/storefront/lib/product-catalog";
import { buildStorefrontMetadata } from "@/features/storefront/lib/seo";
import { storefrontButtonClass, storefrontCornerClass } from "@/features/storefront/lib/style-classes";
import { storefrontRepository } from "@/features/storefront/repository/storefront.repository";
import { productRepository } from "@/features/knowledge-base/repository/product.repository";
import { serviceRepository } from "@/features/knowledge-base/repository/service.repository";
import { orderRepository } from "@/features/orders/repository/order.repository";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; category?: string; sort?: string; preview?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const row = await storefrontRepository.findPublishedByWorkspaceSlug(slug);
  if (!row) return {};
  const t = await getTranslations("website.public");
  return buildStorefrontMetadata({
    slug,
    path: "/products",
    workspaceName: row.workspaceName,
    storefront: row.storefront,
    title: `${t("productsHeading")} — ${row.workspaceName}`,
    fallbackImageUrl: row.logoUrl,
  });
}

export default async function StoreProductsPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { q, category, sort, preview } = await searchParams;
  const t = await getTranslations("website.public");
  const { storefront, workspaceId, workspaceName, logoUrl } = await getStorefrontData(slug, { preview: preview === "1" });

  const [products, services, salesCounts] = await Promise.all([
    productRepository.findByWorkspaceId(workspaceId),
    serviceRepository.findByWorkspaceId(workspaceId),
    orderRepository.sumQuantityByProductId(workspaceId),
  ]);
  const activeProducts = products.filter((product) => product.isActive);
  const activeServices = services.filter((service) => service.isActive);
  const categories = storefront.showCategories ? extractCategories(activeProducts) : [];
  const resolvedSort = SORT_OPTIONS.includes(sort as ProductSort) ? (sort as ProductSort) : "newest";
  const visibleProducts = filterAndSortProducts(activeProducts, { search: q, category, sort: resolvedSort }, salesCounts);
  const secondaryColor = storefront.secondaryColor && /^#[0-9a-fA-F]{6}$/.test(storefront.secondaryColor) ? storefront.secondaryColor : "#f97316";
  const cornerClass = storefrontCornerClass(storefront);
  const buttonClass = storefrontButtonClass(storefront);
  // Gated on the total catalog size, never the post-filter result count, so the search box can't
  // disappear mid-search just because a query narrowed the visible results below the threshold.
  const searchVisible = shouldShowSearch(storefront.showSearch, activeProducts.length);

  return (
    <StorefrontShell storefront={storefront} workspaceName={workspaceName} workspaceId={workspaceId} logoUrl={logoUrl} slug={slug}>
      <div className="mx-auto max-w-5xl space-y-10 px-6 py-12">
        <section className="space-y-4">
          <h1 className="text-2xl font-semibold">{t("productsHeading")}</h1>

          {(searchVisible || categories.length > 0) && (
            <ProductFilters slug={slug} q={q} category={category} sort={resolvedSort} categories={categories} showSearch={searchVisible} />
          )}

          {visibleProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noProducts")}</p>
          ) : (
            <div className={productGridClass(storefront.productDisplayMode)}>
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  slug={slug}
                  product={product}
                  mode={storefront.productDisplayMode}
                  secondaryColor={secondaryColor}
                  cornerClass={cornerClass}
                  buttonClass={buttonClass}
                  showDescription={storefront.showProductDescription}
                  showComparePrice={storefront.showComparePrice}
                />
              ))}
            </div>
          )}
        </section>

        {activeServices.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-medium">{t("servicesHeading")}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeServices.map((service) => (
                <Card key={service.id}>
                  <CardContent className="space-y-1">
                    <p className="font-medium">{service.name}</p>
                    {service.description && <p className="text-sm text-muted-foreground">{service.description}</p>}
                    {service.price && <p className="text-sm font-medium text-primary">{service.price}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </StorefrontShell>
  );
}
