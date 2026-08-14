import { FileQuestion } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/empty-state";
import { StorefrontShell } from "@/features/storefront/components/storefront-shell";
import { getStorefrontData } from "@/features/storefront/lib/get-storefront-data";
import { resolveLocalizedStorefrontText } from "@/features/storefront/lib/localized-content";
import { buildStorefrontMetadata } from "@/features/storefront/lib/seo";
import { storefrontRepository } from "@/features/storefront/repository/storefront.repository";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const row = await storefrontRepository.findPublishedByWorkspaceSlug(slug);
  if (!row) return {};
  const [t, locale] = await Promise.all([getTranslations("website.public"), getLocale()]);
  const aboutText = resolveLocalizedStorefrontText(row.storefront, locale).aboutText;
  if (!aboutText) return {};
  return buildStorefrontMetadata({
    slug,
    path: "/about",
    workspaceName: row.workspaceName,
    storefront: row.storefront,
    title: `${t("aboutHeading")} — ${row.workspaceName}`,
    description: aboutText,
  });
}

export default async function StoreAboutPage({ params }: PageProps) {
  const { slug } = await params;
  const [t, locale] = await Promise.all([getTranslations("website.public"), getLocale()]);
  const { storefront, workspaceId, workspaceName, logoUrl } = await getStorefrontData(slug);
  const aboutText = resolveLocalizedStorefrontText(storefront, locale).aboutText;

  return (
    <StorefrontShell storefront={storefront} workspaceName={workspaceName} workspaceId={workspaceId} logoUrl={logoUrl} slug={slug}>
      {aboutText ? (
        <section className="mx-auto max-w-3xl space-y-4 px-6 py-12">
          <h1 className="text-2xl font-semibold">{t("aboutHeading")}</h1>
          <p className="whitespace-pre-wrap text-muted-foreground">{aboutText}</p>
        </section>
      ) : (
        <section className="mx-auto max-w-3xl px-6 py-16">
          <EmptyState icon={FileQuestion} title={t("notFound.policyTitle")} description={t("notFound.policyDescription")} />
        </section>
      )}
    </StorefrontShell>
  );
}
