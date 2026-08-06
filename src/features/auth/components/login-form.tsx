"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { loginAction } from "../actions/login.action";
import { EMAIL_PASSWORD_AUTH_ENABLED } from "../constants";
import { createLoginSchema } from "../validation/schemas";
import { GoogleSignInButton } from "./google-signin-button";

type LoginInput = z.infer<ReturnType<typeof createLoginSchema>>;

export function LoginForm() {
  const router = useRouter();
  const t = useTranslations("auth.login");
  const tValidation = useTranslations("validation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(createLoginSchema(tValidation)) });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await loginAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleSignInButton />
        {EMAIL_PASSWORD_AUTH_ENABLED && (
          <>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              {t("orDivider")}
              <span className="h-px flex-1 bg-border" />
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <Field label={t("emailLabel")} htmlFor="email" error={errors.email}>
                <Input id="email" type="email" autoComplete="email" {...register("email")} />
              </Field>
              <Field label={t("passwordLabel")} htmlFor="password" error={errors.password}>
                <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
              </Field>
              <div className="flex items-center justify-end text-sm">
                <Link href="/forgot-password" className="font-medium text-foreground underline underline-offset-4">
                  {t("forgotPassword")}
                </Link>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t("submitting") : t("submit")}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {t("noAccount")}{" "}
                <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
                  {t("signUp")}
                </Link>
              </p>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
