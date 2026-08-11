import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { PlatformSettingsForm } from "@/features/platform-admin/components/platform-settings-form";
import { platformSettingsRepository } from "@/features/platform-admin/repository/platform-settings.repository";

export default async function PlatformSettingsPage() {
  const t = await getTranslations("platformAdmin.settings");
  const settings = await platformSettingsRepository.get();

  return (
    <PageContainer>
      <PageHeader title={t("title")} description={t("description")} />
      <PlatformSettingsForm initialSettings={settings} />
    </PageContainer>
  );
}
