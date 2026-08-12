import { Bot, Gauge } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { RowList } from "@/components/data-table";
import { PageContainer, Section } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { AiEnabledToggle } from "@/features/platform-admin/components/ai-enabled-toggle";
import { DefaultCreativityControl } from "@/features/platform-admin/components/default-creativity-control";
import { aiUsageAdminRepository } from "@/features/platform-admin/repository/ai-usage-admin.repository";
import { platformSettingsRepository } from "@/features/platform-admin/repository/platform-settings.repository";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";
import { rateLimitRepository } from "@/lib/rate-limit/rate-limit.repository";

export default async function AdminAiOperationsPage() {
  await requirePlatformAdmin();
  const t = await getTranslations("platformAdmin.aiOperations");

  const [settings, byModel, rateLimits] = await Promise.all([
    platformSettingsRepository.get(),
    aiUsageAdminRepository.getByModel(),
    rateLimitRepository.findMostActive(),
  ]);

  return (
    <PageContainer>
      <PageHeader title={t("title")} description={t("description")} />

      <AiEnabledToggle initialEnabled={settings?.aiEnabled ?? true} />
      <DefaultCreativityControl initialCreativity={settings?.defaultCreativity ?? "medium"} />

      <Section title={t("byModelHeading")}>
        <RowList
          items={byModel}
          getRowKey={(row) => `${row.provider}-${row.model}`}
          emptyState={{ icon: Bot, title: t("emptyState") }}
          renderRow={(row) => {
            const successRate = row.requests === 0 ? null : Math.round((row.successCount / row.requests) * 100);
            return (
              <>
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
              </>
            );
          }}
        />
      </Section>

      <Section title={t("rateLimitsHeading")} description={t("rateLimitsDescription")}>
        <RowList
          items={rateLimits}
          getRowKey={(bucket) => bucket.key}
          emptyState={{ icon: Gauge, title: t("rateLimitsEmpty") }}
          renderRow={(bucket) => (
            <>
              <span className="truncate font-mono text-xs">{bucket.key}</span>
              <span className="shrink-0 text-muted-foreground">
                {t("rateLimitCount", { count: bucket.count })} · {new Date(bucket.windowStart).toLocaleTimeString()}
              </span>
            </>
          )}
        />
      </Section>
    </PageContainer>
  );
}
