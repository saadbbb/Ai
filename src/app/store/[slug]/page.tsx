import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { InquiryForm } from "@/features/storefront/components/inquiry-form";
import { PromotionCountdown } from "@/features/storefront/components/promotion-countdown";
import { StorefrontShell } from "@/features/storefront/components/storefront-shell";
import { getStorefrontData } from "@/features/storefront/lib/get-storefront-data";
import { storefrontThemeClasses } from "@/features/storefront/lib/style-classes";
import { storefrontRepository } from "@/features/storefront/repository/storefront.repository";
import { productRepository } from "@/features/knowledge-base/repository/product.repository";
import { serviceRepository } from "@/features/knowledge-base/repository/service.repository";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const row = await storefrontRepository.findPublishedByWorkspaceSlug(slug);
  if (!row) return {};

  const { storefront, workspaceName } = row;
  const title = storefront.seoTitle || storefront.heroTitle || workspaceName;
  const description = storefront.seoDescription || storefront.heroSubtitle || storefront.aboutText || undefined;

  return { title, description, icons: storefront.faviconUrl ? { icon: storefront.faviconUrl } : undefined };
}

export default async function PublicStorePage({ params }: PageProps) {
  const { slug } = await params;
  const t = await getTranslations("website.public");
  const { storefront, workspaceId, workspaceName, logoUrl } = await getStorefrontData(slug);

  const [products, services] = await Promise.all([
    productRepository.findByWorkspaceId(workspaceId),
    serviceRepository.findByWorkspaceId(workspaceId),
  ]);
  const activeProducts = products.filter((product) => product.isActive);
  const activeServices = services.filter((service) => service.isActive);
  const accentColor = storefront.primaryColor && /^#[0-9a-fA-F]{6}$/.test(storefront.primaryColor) ? storefront.primaryColor : "#2563eb";
  const themeClasses = storefrontThemeClasses(storefront);
  const visibleSections = storefront.sections;

  const sectionRenderers: Record<string, React.ReactNode> = {
    hero: (
      <section key="hero" className={`px-6 text-center ${themeClasses.section}`} style={{ backgroundColor: `${accentColor}14` }}>
        <div className="mx-auto max-w-2xl space-y-3">
          <h1 className={`text-3xl ${themeClasses.heading}`}>{storefront.heroTitle || workspaceName}</h1>
          {storefront.heroSubtitle && <p className="text-muted-foreground">{storefront.heroSubtitle}</p>}
        </div>
      </section>
    ),
    about: storefront.aboutText ? (
      <section key="about" className="mx-auto max-w-4xl space-y-2 px-6 py-8">
        <h2 className={`text-lg ${themeClasses.heading}`}>{t("aboutHeading")}</h2>
        <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">{storefront.aboutText}</p>
        <Link href={`/store/${slug}/about`} className="text-sm text-primary hover:underline">
          {t("readMore")}
        </Link>
      </section>
    ) : null,
    featured: (() => {
      const featuredProducts = activeProducts.filter((product) => product.featured);
      if (featuredProducts.length === 0) return null;
      return (
        <section key="featured" className="mx-auto max-w-4xl space-y-3 px-6 py-8">
          <h2 className={`text-lg ${themeClasses.heading}`}>{t("featuredHeading")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.slice(0, 6).map((product) => (
              <Link key={product.id} href={`/store/${slug}/products/${product.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="h-40 w-full rounded-t-lg object-cover" />}
                  <CardContent className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{product.name}</p>
                      {product.promotionEndsAt && <PromotionCountdown endsAt={product.promotionEndsAt.toISOString()} />}
                    </div>
                    <div className="flex items-center gap-2">
                      {product.discountedPrice ? (
                        <>
                          <p className="text-sm font-medium" style={{ color: accentColor }}>{product.discountedPrice}</p>
                          <p className="text-xs text-muted-foreground line-through">{product.price}</p>
                        </>
                      ) : (
                        product.price && <p className="text-sm font-medium" style={{ color: accentColor }}>{product.price}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      );
    })(),
    products: activeProducts.length > 0 ? (
      <section key="products" className="mx-auto max-w-4xl space-y-3 px-6 py-8">
        <div className="flex items-center justify-between">
          <h2 className={`text-lg ${themeClasses.heading}`}>{t("productsHeading")}</h2>
          <Link href={`/store/${slug}/products`} className="text-sm text-primary hover:underline">
            {t("viewAll")}
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeProducts.slice(0, 3).map((product) => (
            <Link key={product.id} href={`/store/${slug}/products/${product.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="h-40 w-full rounded-t-lg object-cover" />}
                <CardContent className="space-y-1">
                  <p className="font-medium">{product.name}</p>
                  {product.price && <p className="text-sm font-medium" style={{ color: accentColor }}>{product.price}</p>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    ) : null,
    services: activeServices.length > 0 ? (
      <section key="services" className="mx-auto max-w-4xl space-y-3 px-6 py-8">
        <h2 className={`text-lg ${themeClasses.heading}`}>{t("servicesHeading")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeServices.slice(0, 3).map((service) => (
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
    ) : null,
    contact: (
      <section key="contact" className="mx-auto max-w-md space-y-3 px-6 py-8">
        <h2 className={`text-lg ${themeClasses.heading}`}>{t("contactHeading")}</h2>
        {(storefront.contactPhone || storefront.contactEmail) && (
          <p className="text-sm text-muted-foreground">
            {[storefront.contactPhone, storefront.contactEmail].filter(Boolean).join(" · ")}
          </p>
        )}
        <InquiryForm slug={slug} />
      </section>
    ),
  };

  return (
    <StorefrontShell storefront={storefront} workspaceName={workspaceName} logoUrl={logoUrl} slug={slug}>
      {visibleSections.map((key) => sectionRenderers[key] ?? null)}
    </StorefrontShell>
  );
}
