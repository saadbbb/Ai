import { getTranslations } from "next-intl/server";
import { StorefrontShell } from "@/features/storefront/components/storefront-shell";
import { getStorefrontData } from "@/features/storefront/lib/get-storefront-data";
import { faqRepository } from "@/features/knowledge-base/repository/faq.repository";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function StoreFaqPage({ params }: PageProps) {
  const { slug } = await params;
  const t = await getTranslations("website.public");
  const { storefront, workspaceId, workspaceName, logoUrl } = await getStorefrontData(slug);
  const faqs = await faqRepository.findByWorkspaceId(workspaceId);

  return (
    <StorefrontShell storefront={storefront} workspaceName={workspaceName} logoUrl={logoUrl} slug={slug}>
      <section className="mx-auto max-w-3xl space-y-4 px-6 py-12">
        <h1 className="text-2xl font-semibold">{t("faqHeading")}</h1>
        {faqs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noFaqs")}</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {faqs.map((faq) => (
              <div key={faq.id} className="space-y-1 p-4">
                <p className="font-medium">{faq.question}</p>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </StorefrontShell>
  );
}
