import { getTranslations } from "next-intl/server";
import { AiEnabledToggle } from "@/features/platform-admin/components/ai-enabled-toggle";
import { aiUsageAdminRepository } from "@/features/platform-admin/repository/ai-usage-admin.repository";
import { platformSettingsRepository } from "@/features/platform-admin/repository/platform-settings.repository";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";

export default async function AdminAiOperationsPage() {
  await requirePlatformAdmin();
  const t = await getTranslations("platformAdmin.aiOperations");

  const [settings, byModel] = await Promise.all([
    platformSettingsRepository.get(),
    aiUsageAdminRepository.getByModel(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <AiEnabledToggle initialEnabled={settings?.aiEnabled ?? true} />

      <div className="space-y-3">
        <h2 className="text-sm font-medium">{t("byModelHeading")}</h2>
        {byModel.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t("emptyState")}
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {byModel.map((row) => {
              const successRate = row.requests === 0 ? null : Math.round((row.successCount / row.requests) * 100);
              return (
                <div key={`${row.provider}-${row.model}`} className="flex items-center justify-between gap-4 p-3 text-sm">
                  <div>
                    <p className="font-medium">{row.model}</p>
                    <p className="text-muted-foreground">{row.provider}</p>
                  </div>
                  <div className="shrink-0 text-end text-muted-foreground">
                    <p>{t("modelRequests", { count: row.requests })}</p>
                    <p>
                      {successRate === null ? "—" : `${successRate}%`} · {t("msValue", { ms: row.avgLatencyMs })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
