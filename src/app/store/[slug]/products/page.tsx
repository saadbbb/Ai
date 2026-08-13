import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { ProductCard } from "@/features/storefront/components/product-card";
import { StorefrontShell } from "@/features/storefront/components/storefront-shell";
import { getStorefrontData } from "@/features/storefront/lib/get-storefront-data";
import {
  extractCategories,
  filterAndSortProducts,
  productGridClass,
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

const SORT_OPTIONS: ProductSort[] = ["newest", "price_asc", "price_desc", "best_selling", "discounted"];

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
  const categories = extractCategories(activeProducts);
  const resolvedSort = SORT_OPTIONS.includes(sort as ProductSort) ? (sort as ProductSort) : "newest";
  const visibleProducts = filterAndSortProducts(activeProducts, { search: q, category, sort: resolvedSort }, salesCounts);
  const accentColor = storefront.primaryColor && /^#[0-9a-fA-F]{6}$/.test(storefront.primaryColor) ? storefront.primaryColor : "#2563eb";
  const secondaryColor = storefront.secondaryColor && /^#[0-9a-fA-F]{6}$/.test(storefront.secondaryColor) ? storefront.secondaryColor : "#f97316";
  const cornerClass = storefrontCornerClass(storefront);
  const buttonClass = storefrontButtonClass(storefront);

  return (
    <StorefrontShell storefront={storefront} workspaceName={workspaceName} logoUrl={logoUrl} slug={slug}>
      <div className="mx-auto max-w-5xl space-y-10 px-6 py-12">
        <section className="space-y-4">
          <h1 className="text-2xl font-semibold">{t("productsHeading")}</h1>

          {(storefront.showSearch || (storefront.showCategories && categories.length > 0)) && (
            <form className="flex flex-wrap items-center gap-2" method="get">
              {storefront.showSearch && (
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder={t("searchPlaceholder")}
                  className="h-9 min-w-48 flex-1 rounded-md border bg-transparent px-3 text-sm outline-none"
                />
              )}
              {storefront.showCategories && categories.length > 0 && (
                <select name="category" defaultValue={category ?? ""} className="h-9 rounded-md border bg-transparent px-2 text-sm">
                  <option value="">{t("allCategories")}</option>
                  {categories.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}
              <select name="sort" defaultValue={resolvedSort} className="h-9 rounded-md border bg-transparent px-2 text-sm">
                {SORT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(`sortOptions.${option}`)}
                  </option>
                ))}
              </select>
              <button type="submit" className="h-9 rounded-md border px-3 text-sm hover:bg-muted">
                {t("applyFilters")}
              </button>
            </form>
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
                  accentColor={accentColor}
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
                    {service.price && <p className="text-sm font-medium" style={{ color: accentColor }}>{service.price}</p>}
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
