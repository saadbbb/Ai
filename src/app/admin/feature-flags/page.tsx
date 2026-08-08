import { getTranslations } from "next-intl/server";
import { FeatureFlagManager } from "@/features/platform-admin/components/feature-flag-manager";
import { featureFlagRepository } from "@/features/platform-admin/repository/feature-flag.repository";
import { workspaceAdminRepository } from "@/features/platform-admin/repository/workspace-admin.repository";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";

export default async function AdminFeatureFlagsPage() {
  await requirePlatformAdmin();
  const t = await getTranslations("platformAdmin.featureFlags");

  const [flags, workspaces] = await Promise.all([featureFlagRepository.findAll(), workspaceAdminRepository.findAllWithOwner()]);
  const overridesByFlag = await Promise.all(flags.map((flag) => featureFlagRepository.findOverridesByFlagId(flag.id)));
  const workspaceOptions = workspaces.map(({ workspace }) => ({ id: workspace.id, name: workspace.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <FeatureFlagManager
        initialFlags={flags}
        initialOverrides={Object.fromEntries(flags.map((flag, index) => [flag.id, overridesByFlag[index]]))}
        workspaceOptions={workspaceOptions}
      />
    </div>
  );
}
