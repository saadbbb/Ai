import { getTranslations } from "next-intl/server";
import { TestChat } from "@/features/ai/components/test-chat";

export default async function TestAiPage() {
  const t = await getTranslations("aiTest");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <TestChat />
    </div>
  );
}
