import { LifeBuoy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { platformSettingsRepository } from "@/features/platform-admin/repository/platform-settings.repository";

export default async function ForgotPasswordPhonePage() {
  const t = await getTranslations("auth.forgotPasswordPhone");
  const settings = await platformSettingsRepository.get();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings?.whatsappNumber ? (
          <Button asChild className="w-full">
            <a href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
              <LifeBuoy />
              {t("contactSupport")}
            </a>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noContactConfigured")}</p>
        )}
        <Button asChild type="button" variant="outline" className="w-full">
          <Link href="/login">{t("backToLogin")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
