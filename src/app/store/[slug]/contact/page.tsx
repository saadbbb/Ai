import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContactFormTabs } from "@/features/storefront/components/contact-form-tabs";
import { StorefrontShell } from "@/features/storefront/components/storefront-shell";
import { getStorefrontData } from "@/features/storefront/lib/get-storefront-data";
import { buildStorefrontMetadata } from "@/features/storefront/lib/seo";
import { storefrontRepository } from "@/features/storefront/repository/storefront.repository";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const row = await storefrontRepository.findPublishedByWorkspaceSlug(slug);
  if (!row) return {};
  const t = await getTranslations("website.public");
  return buildStorefrontMetadata({
    slug,
    path: "/contact",
    workspaceName: row.workspaceName,
    storefront: row.storefront,
    title: `${t("contactHeading")} — ${row.workspaceName}`,
  });
}

export default async function StoreContactPage({ params }: PageProps) {
  const { slug } = await params;
  const t = await getTranslations("website.public");
  const { storefront, workspaceName, logoUrl } = await getStorefrontData(slug);

  return (
    <StorefrontShell storefront={storefront} workspaceName={workspaceName} logoUrl={logoUrl} slug={slug}>
      <section className="mx-auto max-w-md space-y-4 px-6 py-12">
        <h1 className="text-2xl font-semibold">{t("contactHeading")}</h1>
        {(storefront.contactPhone || storefront.contactEmail) && (
          <p className="text-sm text-muted-foreground">
            {[storefront.contactPhone, storefront.contactEmail].filter(Boolean).join(" · ")}
          </p>
        )}
        <ContactFormTabs slug={slug} />
      </section>
    </StorefrontShell>
  );
}
