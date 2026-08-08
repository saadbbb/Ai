import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { systemHealthService, type SystemHealthCheck } from "@/features/platform-admin/services/system-health.service";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";

const STATUS_COLOR: Record<SystemHealthCheck["status"], string> = {
  ok: "var(--status-good)",
  degraded: "var(--status-critical)",
  not_configured: "var(--status-warning)",
};

export default async function AdminSystemHealthPage() {
  await requirePlatformAdmin();
  const t = await getTranslations("platformAdmin.systemHealth");

  const report = await systemHealthService.getReport();
  const rows: { key: keyof typeof report; label: string }[] = [
    { key: "database", label: t("database") },
    { key: "redis", label: t("redis") },
    { key: "queue", label: t("queue") },
    { key: "email", label: t("email") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map(({ key, label }) => {
          const check = report[key];
          return (
            <Card key={key}>
              <CardContent className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{label}</p>
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-medium text-white"
                    style={{ backgroundColor: STATUS_COLOR[check.status] }}
                  >
                    {t(`statuses.${check.status}`)}
                  </span>
                </div>
                {check.latencyMs !== null && (
                  <p className="text-xs text-muted-foreground">{t("latency", { ms: check.latencyMs })}</p>
                )}
                {check.detail && <p className="text-xs text-muted-foreground">{check.detail}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
