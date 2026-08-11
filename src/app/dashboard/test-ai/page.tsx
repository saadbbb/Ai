import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { TestChat } from "@/features/ai/components/test-chat";

export default async function TestAiPage() {
  const t = await getTranslations("aiTest");

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} description={t("description")} />
      <TestChat />
    </div>
  );
}
