import { getTranslations } from "next-intl/server";
import { NewWorkflowForm } from "@/features/automation/components/new-workflow-form";

export default async function NewWorkflowPage() {
  const t = await getTranslations("automations.new");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <NewWorkflowForm />
    </div>
  );
}
