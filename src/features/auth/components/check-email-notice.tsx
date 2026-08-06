import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Shown after sign-up when Supabase requires email confirmation before a session exists. */
export async function CheckEmailNotice({ email }: { email: string }) {
  const t = await getTranslations("auth.verify");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("checkEmailTitle")}</CardTitle>
        <CardDescription>{email ? t("checkEmailDescription", { email }) : t("checkEmailDescriptionGeneric")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/login" className="text-sm font-medium text-foreground underline underline-offset-4">
          {t("backToLogin")}
        </Link>
      </CardContent>
    </Card>
  );
}
