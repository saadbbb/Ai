import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FileQuestion } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StorefrontShell } from "@/features/storefront/components/storefront-shell";
import { getStorefrontData } from "@/features/storefront/lib/get-storefront-data";
import { buildStorefrontMetadata } from "@/features/storefront/lib/seo";
import { storefrontPageRepository } from "@/features/storefront/repository/storefront-page.repository";
import { storefrontRepository } from "@/features/storefront/repository/storefront.repository";

interface PageProps {
  params: Promise<{ slug: string; pageSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, pageSlug } = await params;
  const row = await storefrontRepository.findPublishedByWorkspaceSlug(slug);
  if (!row) return {};
  const page = await storefrontPageRepository.findPublishedBySlug(row.workspaceId, pageSlug);
  if (!page) return {};
  return buildStorefrontMetadata({
    slug,
    path: `/pages/${pageSlug}`,
    workspaceName: row.workspaceName,
    storefront: row.storefront,
    title: `${page.title} — ${row.workspaceName}`,
  });
}

export default async function StoreCustomPage({ params }: PageProps) {
  const { slug, pageSlug } = await params;
  const [t, { storefront, workspaceName, logoUrl, workspaceId }] = await Promise.all([
    getTranslations("website.public.notFound"),
    getStorefrontData(slug),
  ]);

  const page = await storefrontPageRepository.findPublishedBySlug(workspaceId, pageSlug);

  return (
    <StorefrontShell storefront={storefront} workspaceName={workspaceName} workspaceId={workspaceId} logoUrl={logoUrl} slug={slug}>
      {page ? (
        <section className="mx-auto max-w-3xl space-y-4 px-6 py-12">
          <h1 className="text-2xl font-semibold">{page.title}</h1>
          <p className="whitespace-pre-wrap text-muted-foreground">{page.content}</p>
        </section>
      ) : (
        <section className="mx-auto max-w-3xl px-6 py-16">
          <EmptyState icon={FileQuestion} title={t("pageTitle")} description={t("pageDescription")} />
        </section>
      )}
    </StorefrontShell>
  );
}
