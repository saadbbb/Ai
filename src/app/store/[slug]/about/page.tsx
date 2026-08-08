import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { StorefrontShell } from "@/features/storefront/components/storefront-shell";
import { getStorefrontData } from "@/features/storefront/lib/get-storefront-data";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function StoreAboutPage({ params }: PageProps) {
  const { slug } = await params;
  const t = await getTranslations("website.public");
  const { storefront, workspaceName, logoUrl } = await getStorefrontData(slug);

  if (!storefront.aboutText) notFound();

  return (
    <StorefrontShell storefront={storefront} workspaceName={workspaceName} logoUrl={logoUrl} slug={slug}>
      <section className="mx-auto max-w-3xl space-y-4 px-6 py-12">
        <h1 className="text-2xl font-semibold">{t("aboutHeading")}</h1>
        <p className="whitespace-pre-wrap text-muted-foreground">{storefront.aboutText}</p>
      </section>
    </StorefrontShell>
  );
}
