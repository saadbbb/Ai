import { CheckCircle2, PackageSearch } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { StorefrontShell } from "@/features/storefront/components/storefront-shell";
import { formatPrice } from "@/features/storefront/lib/format-price";
import { getStorefrontData } from "@/features/storefront/lib/get-storefront-data";
import { buildStorefrontMetadata } from "@/features/storefront/lib/seo";
import { storefrontRepository } from "@/features/storefront/repository/storefront.repository";
import { storefrontService } from "@/features/storefront/services/storefront.service";

interface PageProps {
  params: Promise<{ slug: string; orderId: string }>;
}

/** A one-time confirmation link, never landing-page content — kept out of search results. */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const row = await storefrontRepository.findPublishedByWorkspaceSlug(slug);
  if (!row) return {};
  const t = await getTranslations("website.public");
  return buildStorefrontMetadata({
    slug,
    path: "/checkout/success",
    workspaceName: row.workspaceName,
    storefront: row.storefront,
    title: `${t("orderSuccessHeading")} — ${row.workspaceName}`,
    noIndex: true,
  });
}

export default async function OrderSuccessPage({ params }: PageProps) {
  const { slug, orderId } = await params;
  const [t, locale] = await Promise.all([getTranslations("website.public"), getLocale()]);
  const { storefront, workspaceId, workspaceName, logoUrl } = await getStorefrontData(slug);

  const confirmation = await storefrontService.getOrderConfirmation(slug, orderId);
  if (!confirmation) {
    return (
      <StorefrontShell storefront={storefront} workspaceName={workspaceName} workspaceId={workspaceId} logoUrl={logoUrl} slug={slug}>
        <section className="mx-auto max-w-3xl px-6 py-16">
          <EmptyState icon={PackageSearch} title={t("notFound.orderTitle")} description={t("notFound.orderDescription")} />
        </section>
      </StorefrontShell>
    );
  }

  return (
    <StorefrontShell storefront={storefront} workspaceName={workspaceName} workspaceId={workspaceId} logoUrl={logoUrl} slug={slug}>
      <section className="mx-auto max-w-md space-y-6 px-6 py-16 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="size-9" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold">{t("orderSuccessHeading")}</h1>
          <p className="text-sm text-muted-foreground">{t("orderSuccessThankYou")}</p>
        </div>

        <Card className="text-start">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("orderNumberLabel")}</span>
              <span className="font-mono font-medium">#{confirmation.orderId.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="space-y-1 divide-y">
              {confirmation.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                  <span className="min-w-0 truncate text-muted-foreground">
                    {item.name}
                    {item.variantName ? ` — ${item.variantName}` : ""} × {item.quantity}
                  </span>
                  <span className="shrink-0 font-medium">{formatPrice(Number.parseFloat(item.unitPrice) * item.quantity, locale)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
              <span>{t("cartGrandTotal")}</span>
              <span>{formatPrice(confirmation.total, locale)}</span>
            </div>
          </CardContent>
        </Card>

        <Link href={`/store/${slug}`} className="inline-block text-sm font-medium text-primary hover:underline">
          {t("backToStore")}
        </Link>
      </section>
    </StorefrontShell>
  );
}
