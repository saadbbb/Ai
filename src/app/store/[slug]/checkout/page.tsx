import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CheckoutForm } from "@/features/storefront/components/checkout-form";
import { StorefrontShell } from "@/features/storefront/components/storefront-shell";
import { getStorefrontData } from "@/features/storefront/lib/get-storefront-data";
import { buildStorefrontMetadata } from "@/features/storefront/lib/seo";
import { storefrontButtonClass } from "@/features/storefront/lib/style-classes";
import { storefrontRepository } from "@/features/storefront/repository/storefront.repository";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** A transactional page, not landing-page content — kept out of search results. */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const row = await storefrontRepository.findPublishedByWorkspaceSlug(slug);
  if (!row) return {};
  const t = await getTranslations("website.public");
  return buildStorefrontMetadata({
    slug,
    path: "/checkout",
    workspaceName: row.workspaceName,
    storefront: row.storefront,
    title: `${t("checkoutHeading")} — ${row.workspaceName}`,
    noIndex: true,
  });
}

export default async function StoreCheckoutPage({ params }: PageProps) {
  const { slug } = await params;
  const t = await getTranslations("website.public");
  const { storefront, workspaceId, workspaceName, logoUrl } = await getStorefrontData(slug);

  return (
    <StorefrontShell storefront={storefront} workspaceName={workspaceName} workspaceId={workspaceId} logoUrl={logoUrl} slug={slug}>
      <section className="mx-auto max-w-md space-y-4 px-6 py-12">
        <h1 className="text-2xl font-semibold">{t("checkoutHeading")}</h1>
        <CheckoutForm slug={slug} buttonClass={storefrontButtonClass(storefront)} />
      </section>
    </StorefrontShell>
  );
}
