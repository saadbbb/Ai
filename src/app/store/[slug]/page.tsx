import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { InquiryForm } from "@/features/storefront/components/inquiry-form";
import { storefrontRepository } from "@/features/storefront/repository/storefront.repository";
import { productRepository } from "@/features/knowledge-base/repository/product.repository";
import { serviceRepository } from "@/features/knowledge-base/repository/service.repository";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicStorePage({ params }: PageProps) {
  const { slug } = await params;
  const t = await getTranslations("website.public");

  const row = await storefrontRepository.findPublishedByWorkspaceSlug(slug);
  if (!row) notFound();

  const { storefront, workspaceId, workspaceName, logoUrl } = row;
  const [products, services] = await Promise.all([
    productRepository.findByWorkspaceId(workspaceId),
    serviceRepository.findByWorkspaceId(workspaceId),
  ]);
  const activeProducts = products.filter((product) => product.isActive);
  const activeServices = services.filter((service) => service.isActive);
  const accentColor = storefront.primaryColor && /^#[0-9a-fA-F]{6}$/.test(storefront.primaryColor) ? storefront.primaryColor : "#2563eb";

  return (
    <div className="min-h-full bg-background">
      <header className="border-b" style={{ borderColor: accentColor }}>
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-6">
          {logoUrl && <img src={logoUrl} alt={workspaceName} className="h-10 w-10 rounded-full object-cover" />}
          <span className="text-lg font-semibold">{workspaceName}</span>
        </div>
      </header>

      <section className="px-6 py-12 text-center" style={{ backgroundColor: `${accentColor}14` }}>
        <div className="mx-auto max-w-2xl space-y-3">
          <h1 className="text-3xl font-semibold">{storefront.heroTitle || workspaceName}</h1>
          {storefront.heroSubtitle && <p className="text-muted-foreground">{storefront.heroSubtitle}</p>}
        </div>
      </section>

      <main className="mx-auto max-w-4xl space-y-10 px-6 py-10">
        {storefront.aboutText && (
          <section className="space-y-2">
            <h2 className="text-lg font-medium">{t("aboutHeading")}</h2>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{storefront.aboutText}</p>
          </section>
        )}

        {activeProducts.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-medium">{t("productsHeading")}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeProducts.map((product) => (
                <Card key={product.id}>
                  {product.imageUrl && (
                    <img src={product.imageUrl} alt={product.name} className="h-40 w-full rounded-t-lg object-cover" />
                  )}
                  <CardContent className="space-y-1">
                    <p className="font-medium">{product.name}</p>
                    {product.description && <p className="text-sm text-muted-foreground">{product.description}</p>}
                    {product.price && <p className="text-sm font-medium" style={{ color: accentColor }}>{product.price}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

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

        <section className="mx-auto max-w-md space-y-3">
          <h2 className="text-lg font-medium">{t("contactHeading")}</h2>
          {(storefront.contactPhone || storefront.contactEmail) && (
            <p className="text-sm text-muted-foreground">
              {[storefront.contactPhone, storefront.contactEmail].filter(Boolean).join(" · ")}
            </p>
          )}
          <InquiryForm slug={slug} />
        </section>
      </main>
    </div>
  );
}
