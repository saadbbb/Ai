import { getTranslations } from "next-intl/server";
import { PlatformSettingsForm } from "@/features/platform-admin/components/platform-settings-form";
import { platformSettingsRepository } from "@/features/platform-admin/repository/platform-settings.repository";

export default async function PlatformSettingsPage() {
  const t = await getTranslations("platformAdmin.settings");
  const settings = await platformSettingsRepository.get();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <PlatformSettingsForm initialSettings={settings} />
    </div>
  );
}
