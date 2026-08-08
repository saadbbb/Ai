import { getTranslations } from "next-intl/server";
import { InquiryForm } from "@/features/storefront/components/inquiry-form";
import { StorefrontShell } from "@/features/storefront/components/storefront-shell";
import { getStorefrontData } from "@/features/storefront/lib/get-storefront-data";

interface PageProps {
  params: Promise<{ slug: string }>;
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
        <InquiryForm slug={slug} />
      </section>
    </StorefrontShell>
  );
}
