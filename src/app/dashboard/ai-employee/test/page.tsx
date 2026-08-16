import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { TestChat } from "@/features/ai/components/test-chat";

export default async function AiEmployeeTestPage() {
  const t = await getTranslations("aiTest");

  return (
    <PageContainer className="space-y-4">
      <PageHeader title={t("title")} description={t("description")} />
      <TestChat />
    </PageContainer>
  );
}
