import { getTranslations } from "next-intl/server";
import { FeatureFlagManager } from "@/features/platform-admin/components/feature-flag-manager";
import { featureFlagRepository } from "@/features/platform-admin/repository/feature-flag.repository";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";

export default async function AdminFeatureFlagsPage() {
  await requirePlatformAdmin();
  const t = await getTranslations("platformAdmin.featureFlags");

  const flags = await featureFlagRepository.findAll();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <FeatureFlagManager initialFlags={flags} />
    </div>
  );
}
