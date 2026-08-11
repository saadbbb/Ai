import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { systemHealthService, type SystemHealthCheck } from "@/features/platform-admin/services/system-health.service";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";

const STATUS_TONE: Record<SystemHealthCheck["status"], string> = {
  ok: "bg-success-soft text-success",
  degraded: "bg-error-soft text-error",
  not_configured: "bg-warning-soft text-warning-foreground",
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
    <PageContainer>
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map(({ key, label }) => {
          const check = report[key];
          return (
            <Card key={key}>
              <CardContent className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{label}</p>
                  <Badge variant="secondary" className={STATUS_TONE[check.status]}>
                    {t(`statuses.${check.status}`)}
                  </Badge>
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
    </PageContainer>
  );
}
