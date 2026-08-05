import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { planRepository } from "@/features/platform-admin/repository/plan.repository";
import { platformSettingsRepository } from "@/features/platform-admin/repository/platform-settings.repository";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

function toWhatsappDigits(number: string): string {
  return number.replace(/[^0-9]/g, "");
}

export default async function BillingPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const t = await getTranslations("billing");
  const tFeatures = await getTranslations("platformAdmin.plans");

  const [settings, plan] = await Promise.all([
    platformSettingsRepository.get(),
    workspace.planId ? planRepository.findById(workspace.planId) : Promise.resolve(null),
  ]);
  const whatsappDigits = settings?.whatsappNumber ? toWhatsappDigits(settings.whatsappNumber) : null;

  const message = (settings?.whatsappMessageTemplate || t("defaultMessage")).replaceAll(
    "{{workspaceName}}",
    workspace.name,
  );
  const whatsappHref = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(message)}`
    : null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Card>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">{t("currentPlan")}</p>
          <p className="text-lg font-semibold">{t(`statuses.${workspace.subscriptionStatus}`)}</p>

          {workspace.subscriptionStatus === "active" ? (
            <>
              <p className="text-sm text-muted-foreground">{t("activeDescription")}</p>
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
    </div>
  );
}
