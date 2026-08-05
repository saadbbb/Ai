import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { platformSettingsRepository } from "@/features/platform-admin/repository/platform-settings.repository";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

function toWhatsappDigits(number: string): string {
  return number.replace(/[^0-9]/g, "");
}

export default async function BillingPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const t = await getTranslations("billing");

  const settings = await platformSettingsRepository.get();
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
            <p className="text-sm text-muted-foreground">{t("activeDescription")}</p>
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
