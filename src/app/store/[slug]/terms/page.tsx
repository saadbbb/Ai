import { FileQuestion } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/empty-state";
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
  if (!row || !row.storefront.termsText) return {};
  const t = await getTranslations("website.public");
  return buildStorefrontMetadata({
    slug,
    path: "/terms",
    workspaceName: row.workspaceName,
    storefront: row.storefront,
    title: `${t("termsHeading")} — ${row.workspaceName}`,
  });
}

export default async function StoreTermsPage({ params }: PageProps) {
  const { slug } = await params;
  const t = await getTranslations("website.public");
  const { storefront, workspaceId, workspaceName, logoUrl } = await getStorefrontData(slug);

  return (
    <StorefrontShell storefront={storefront} workspaceName={workspaceName} workspaceId={workspaceId} logoUrl={logoUrl} slug={slug}>
      {storefront.termsText ? (
        <section className="mx-auto max-w-3xl space-y-4 px-6 py-12">
          <h1 className="text-2xl font-semibold">{t("termsHeading")}</h1>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{storefront.termsText}</p>
        </section>
      ) : (
        <section className="mx-auto max-w-3xl px-6 py-16">
          <EmptyState icon={FileQuestion} title={t("notFound.policyTitle")} description={t("notFound.policyDescription")} />
        </section>
      )}
    </StorefrontShell>
  );
}
