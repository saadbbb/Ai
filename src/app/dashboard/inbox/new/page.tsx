import { getTranslations } from "next-intl/server";
import { NewConversationForm } from "@/features/inbox/components/new-conversation-form";

export default async function NewConversationPage() {
  const t = await getTranslations("inbox.new");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <NewConversationForm />
    </div>
  );
}
