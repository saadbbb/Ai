import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { AppointmentRequestForm } from "@/features/storefront/components/appointment-request-form";
import { InquiryForm } from "@/features/storefront/components/inquiry-form";
import { ProductCard } from "@/features/storefront/components/product-card";
import { PromotionCountdown } from "@/features/storefront/components/promotion-countdown";
import { StorefrontShell } from "@/features/storefront/components/storefront-shell";
import { getStorefrontData } from "@/features/storefront/lib/get-storefront-data";
import { resolveLocalizedStorefrontText } from "@/features/storefront/lib/localized-content";
import { productGridClass } from "@/features/storefront/lib/product-catalog";
import { buildStorefrontMetadata } from "@/features/storefront/lib/seo";
import { storefrontButtonClass, storefrontCornerClass, storefrontThemeClasses } from "@/features/storefront/lib/style-classes";
import { storefrontRepository } from "@/features/storefront/repository/storefront.repository";
import { aiAgentRepository } from "@/features/ai/repository/ai-agent.repository";
import { productRepository } from "@/features/knowledge-base/repository/product.repository";
import { serviceRepository } from "@/features/knowledge-base/repository/service.repository";
import { reviewRepository } from "@/features/storefront/repository/review.repository";
import { getAppUrl } from "@/lib/env";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const row = await storefrontRepository.findPublishedByWorkspaceSlug(slug);
  if (!row) return {};

  const { storefront, workspaceName, workspaceId, logoUrl } = row;
  const locale = await getLocale();
  const localized = resolveLocalizedStorefrontText(storefront, locale);
  const title = storefront.seoTitle || localized.heroTitle || workspaceName;

  let description = storefront.seoDescription || localized.heroSubtitle || localized.aboutText || undefined;
  let fallbackImageUrl = logoUrl;
  if (!description || !storefront.bannerImageUrl) {
    const [agent, products] = await Promise.all([
      !description ? aiAgentRepository.findByWorkspaceId(workspaceId) : null,
      !storefront.bannerImageUrl ? productRepository.findByWorkspaceId(workspaceId) : [],
    ]);
    description = description || agent?.businessDescription || undefined;
    fallbackImageUrl = products.find((p) => p.isActive && p.imageUrl)?.imageUrl || logoUrl;
  }

  return buildStorefrontMetadata({ slug, workspaceName, storefront, title, description, fallbackImageUrl });
}

export default async function PublicStorePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const [t, locale] = await Promise.all([getTranslations("website.public"), getLocale()]);
  const { storefront, workspaceId, workspaceName, logoUrl } = await getStorefrontData(slug, { preview: preview === "1" });
  const localizedText = resolveLocalizedStorefrontText(storefront, locale);

  const [products, services, reviews] = await Promise.all([
    productRepository.findByWorkspaceId(workspaceId),
    serviceRepository.findByWorkspaceId(workspaceId),
    reviewRepository.findPublishedByWorkspaceId(workspaceId),
  ]);
  const activeProducts = products.filter((product) => product.isActive);
  const activeServices = services.filter((service) => service.isActive);
  const accentColor = storefront.primaryColor && /^#[0-9a-fA-F]{6}$/.test(storefront.primaryColor) ? storefront.primaryColor : "#2563eb";
  const secondaryColor = storefront.secondaryColor && /^#[0-9a-fA-F]{6}$/.test(storefront.secondaryColor) ? storefront.secondaryColor : "#f97316";
  const themeClasses = storefrontThemeClasses(storefront);
  const cornerClass = storefrontCornerClass(storefront);
  const buttonClass = storefrontButtonClass(storefront);
  const visibleSections = storefront.sections;

  const sectionRenderers: Record<string, React.ReactNode> = {
    hero: (
      <section key="hero" className={`px-6 text-center ${themeClasses.section}`} style={{ backgroundColor: `${accentColor}14` }}>
        <div className="mx-auto max-w-2xl space-y-4">
          <h1 className={`text-3xl ${themeClasses.heading}`}>{localizedText.heroTitle || workspaceName}</h1>
          {localizedText.heroSubtitle && <p className="text-muted-foreground">{localizedText.heroSubtitle}</p>}
          {storefront.heroCtaLabel && storefront.heroCtaLink && (
            <Link
              href={
                storefront.heroCtaLink.startsWith("#") || storefront.heroCtaLink.startsWith("/")
                  ? `/store/${slug}${storefront.heroCtaLink}`
                  : storefront.heroCtaLink
              }
              className="inline-flex h-10 items-center rounded-md px-5 text-sm font-medium text-white"
              style={{ backgroundColor: accentColor }}
            >
              {storefront.heroCtaLabel}
            </Link>
          )}
        </div>
      </section>
    ),
    about: localizedText.aboutText ? (
      <section key="about" className="mx-auto max-w-4xl space-y-2 px-6 py-8">
        <h2 className={`text-lg ${themeClasses.heading}`}>{t("aboutHeading")}</h2>
        <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">{localizedText.aboutText}</p>
        <Link href={`/store/${slug}/about`} className="text-sm text-primary hover:underline">
          {t("readMore")}
        </Link>
      </section>
    ) : null,
    featured: (() => {
      const featuredProducts = activeProducts.filter((product) => product.featured);
      if (featuredProducts.length === 0) return null;
      return (
        <section key="featured" className="mx-auto max-w-5xl space-y-3 px-6 py-8">
          <h2 className={`text-lg ${themeClasses.heading}`}>{t("featuredHeading")}</h2>
          <div className={productGridClass(storefront.productDisplayMode)}>
            {featuredProducts.slice(0, 6).map((product) => (
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
                badge={product.promotionEndsAt ? <PromotionCountdown endsAt={product.promotionEndsAt.toISOString()} /> : undefined}
              />
            ))}
          </div>
        </section>
      );
    })(),
    products: activeProducts.length > 0 ? (
      <section key="products" className="mx-auto max-w-5xl space-y-3 px-6 py-8">
        <div className="flex items-center justify-between">
          <h2 className={`text-lg ${themeClasses.heading}`}>{t("productsHeading")}</h2>
          <Link href={`/store/${slug}/products`} className="text-sm text-primary hover:underline">
            {t("viewAll")}
          </Link>
        </div>
        <div className={productGridClass(storefront.productDisplayMode)}>
          {activeProducts.slice(0, 3).map((product) => (
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
      </section>
    ) : null,
    services: activeServices.length > 0 ? (
      <section key="services" className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <div className="space-y-3">
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
        </div>
        <div className="mx-auto max-w-sm space-y-3">
          <h3 className={`text-base ${themeClasses.heading}`}>{t("appointmentHeading")}</h3>
          <AppointmentRequestForm slug={slug} services={activeServices.map((service) => ({ id: service.id, name: service.name }))} />
        </div>
      </section>
    ) : null,
    testimonials: (() => {
      const featuredReviews = reviews.filter((review) => review.isFeatured);
      const displayedReviews = (featuredReviews.length > 0 ? featuredReviews : reviews).slice(0, 6);
      if (displayedReviews.length === 0) return null;
      return (
        <section key="testimonials" className="mx-auto max-w-4xl space-y-3 px-6 py-8">
          <h2 className={`text-lg ${themeClasses.heading}`}>{t("testimonialsHeading")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayedReviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="space-y-1">
                  <p className="text-sm text-amber-500" aria-hidden>
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </p>
                  <p className="text-sm text-muted-foreground">{review.text}</p>
                  <p className="text-sm font-medium">{review.authorName}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      );
    })(),
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

  const averageRating =
    reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: workspaceName,
    url: `${getAppUrl()}/store/${slug}`,
    ...(logoUrl ? { image: logoUrl } : undefined),
    ...(storefront.contactPhone ? { telephone: storefront.contactPhone } : undefined),
    ...(storefront.contactEmail ? { email: storefront.contactEmail } : undefined),
    ...(localizedText.aboutText ? { description: localizedText.aboutText } : undefined),
    ...(averageRating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: averageRating.toFixed(1),
            reviewCount: reviews.length,
          },
        }
      : undefined),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <StorefrontShell storefront={storefront} workspaceName={workspaceName} logoUrl={logoUrl} slug={slug}>
        {visibleSections.map((key) => sectionRenderers[key] ?? null)}
      </StorefrontShell>
    </>
  );
}
