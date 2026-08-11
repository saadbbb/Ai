import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { BusinessInfoSettingsForm } from "@/features/ai/components/business-info-settings-form";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function WorkspaceProfilePage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const t = await getTranslations("workspaceProfile");

  return (
    <div className="space-y-6">
      <PageHeader title={t("pageTitle")} description={t("pageDescription")} />

      <BusinessInfoSettingsForm
        defaultValues={{
          name: workspace.name,
          businessType: workspace.businessType ?? "",
          country: workspace.country ?? "",
          timezone: workspace.timezone,
          language: workspace.language,
          logoUrl: workspace.logoUrl ?? "",
        }}
      />
    </div>
  );
}
