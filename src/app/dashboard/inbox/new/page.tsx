import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { NewConversationForm } from "@/features/inbox/components/new-conversation-form";

export default async function NewConversationPage() {
  const t = await getTranslations("inbox.new");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <NewConversationForm />
    </div>
  );
}
