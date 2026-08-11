import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { IN_GOOD_STANDING_STATUSES } from "@/db/schema";
import { planRepository } from "@/features/platform-admin/repository/plan.repository";
import { platformSettingsRepository } from "@/features/platform-admin/repository/platform-settings.repository";
import { invoiceService } from "@/features/platform-admin/services/invoice.service";
import { usageService, type UsageDimension } from "@/features/platform-admin/services/usage.service";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

const USAGE_DIMENSIONS: UsageDimension[] = [
  "users",
  "aiAgents",
  "channels",
  "conversationsPerMonth",
  "knowledgeFiles",
  "automationWorkflows",
  "integrations",
];

function toWhatsappDigits(number: string): string {
  return number.replace(/[^0-9]/g, "");
}

export default async function BillingPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const t = await getTranslations("billing");
  const tFeatures = await getTranslations("platformAdmin.plans");

  const isInGoodStanding = (IN_GOOD_STANDING_STATUSES as readonly string[]).includes(workspace.subscriptionStatus);
  const isOverdue = workspace.subscriptionStatus === "past_due" || workspace.subscriptionStatus === "grace";

  const [settings, plan, invoices] = await Promise.all([
    platformSettingsRepository.get(),
    workspace.planId ? planRepository.findById(workspace.planId) : Promise.resolve(null),
    invoiceService.listForWorkspace(workspace.id),
  ]);
  const usage = isInGoodStanding ? await usageService.getUsageSnapshot(workspace.id, plan) : null;
  const whatsappDigits = settings?.whatsappNumber ? toWhatsappDigits(settings.whatsappNumber) : null;

  const message = (settings?.whatsappMessageTemplate || t("defaultMessage")).replaceAll(
    "{{workspaceName}}",
    workspace.name,
  );
  const whatsappHref = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(message)}`
    : null;

  return (
    <PageContainer className="mx-auto max-w-lg">
      <PageHeader title={t("title")} description={t("description")} />

      <Card>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">{t("currentPlan")}</p>
          <p className="text-lg font-semibold">{t(`statuses.${workspace.subscriptionStatus}`)}</p>

          {isInGoodStanding ? (
            <>
              <p className="text-sm text-muted-foreground">{isOverdue ? t(`overdue.${workspace.subscriptionStatus}`) : t("activeDescription")}</p>
              {plan && (
                <div className="space-y-1 rounded-lg border p-3 text-start text-sm">
                  <p className="font-medium">{plan.name}</p>
                  {workspace.subscriptionExpiresAt && (
                    <p className="text-muted-foreground">
                      {t("expiresOn", {
                        date: new Intl.DateTimeFormat("en-GB", {
                          timeZone: workspace.timezone,
                          dateStyle: "medium",
                        }).format(new Date(workspace.subscriptionExpiresAt)),
                      })}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    {plan.enabledFeatures.map((key) => tFeatures(`features.${key}`)).join(", ")}
                  </p>
                </div>
              )}

              {usage && (
                <div className="space-y-3 rounded-lg border p-3 text-start text-sm">
                  <p className="font-medium">{t("usageHeading")}</p>
                  {USAGE_DIMENSIONS.filter((dimension) => usage[dimension].limit != null).map((dimension) => {
                    const metric = usage[dimension];
                    return (
                      <div key={dimension} className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{t(`usage.${dimension}`)}</span>
                          <span>
                            {metric.used}/{metric.limit}
                          </span>
                        </div>
                        <Progress
                          value={Math.min(metric.percentUsed ?? 0, 100)}
                          className="h-1.5"
                          indicatorClassName={cn(
                            (metric.percentUsed ?? 0) >= 100
                              ? "bg-destructive"
                              : (metric.percentUsed ?? 0) >= 80
                                ? "bg-warning"
                                : "bg-primary"
                          )}
                        />
                      </div>
                    );
                  })}
                  {USAGE_DIMENSIONS.every((dimension) => usage[dimension].limit == null) && (
                    <p className="text-xs text-muted-foreground">{t("usageUnlimited")}</p>
                  )}
                </div>
              )}
            </>
          ) : whatsappHref ? (
            <>
              <p className="text-sm text-muted-foreground">{t("ctaDescription")}</p>
              <Button asChild size="lg">
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  {t("whatsappCta")}
                </a>
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {settings?.supportEmail ? t("fallbackWithEmail", { email: settings.supportEmail }) : t("fallbackNoContact")}
            </p>
          )}
        </CardContent>
      </Card>

      {invoices.length > 0 && (
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium">{t("historyHeading")}</p>
            <div className="divide-y">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div>
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.planName} · {invoice.amount} {invoice.currency} · {invoice.issuedAt.toISOString().slice(0, 10)}
                    </p>
                  </div>
                  <a
                    href={`/api/invoices/${invoice.id}/pdf`}
                    className="shrink-0 text-xs font-medium text-primary hover:underline"
                  >
                    {t("downloadPdf")}
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
