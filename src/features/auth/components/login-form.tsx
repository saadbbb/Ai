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
import { loginWithPhoneAction } from "../actions/login-with-phone.action";
import { EMAIL_PASSWORD_AUTH_ENABLED } from "../constants";
import { createLoginSchema, createPhoneLoginSchema } from "../validation/schemas";
import { GoogleSignInButton } from "./google-signin-button";

type PhoneLoginInput = z.infer<ReturnType<typeof createPhoneLoginSchema>>;
type LoginInput = z.infer<ReturnType<typeof createLoginSchema>>;

export function LoginForm() {
  const router = useRouter();
  const t = useTranslations("auth.login");
  const tValidation = useTranslations("validation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register: registerPhone,
    handleSubmit: handlePhoneSubmit,
    formState: { errors: phoneErrors },
  } = useForm<PhoneLoginInput>({ resolver: zodResolver(createPhoneLoginSchema(tValidation)) });
  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors },
  } = useForm<LoginInput>({ resolver: zodResolver(createLoginSchema(tValidation)) });

  const onPhoneSubmit = handlePhoneSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await loginWithPhoneAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  });

  const onEmailSubmit = handleEmailSubmit(async (values) => {
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
        <CardTitle className="text-xl">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleSignInButton />

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          {t("orDivider")}
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onPhoneSubmit} className="space-y-4">
          <Field label={t("phoneLabel")} htmlFor="phone" error={phoneErrors.phone}>
            <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="07XXXXXXXXX" {...registerPhone("phone")} />
          </Field>
          <Field label={t("passwordLabel")} htmlFor="password" error={phoneErrors.password}>
            <Input id="password" type="password" autoComplete="current-password" {...registerPhone("password")} />
          </Field>
          <div className="flex items-center justify-end text-sm">
            <Link href="/forgot-password/phone" className="font-medium text-foreground underline underline-offset-4">
              {t("forgotPassword")}
            </Link>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t("submitting") : t("submit")}
          </Button>
        </form>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          {t("noAccount")}
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button asChild type="button" variant="outline" className="w-full">
          <Link href="/register">{t("signUp")}</Link>
        </Button>

        {EMAIL_PASSWORD_AUTH_ENABLED && (
          <>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              {t("orDivider")}
              <span className="h-px flex-1 bg-border" />
            </div>
            <form onSubmit={onEmailSubmit} className="space-y-4">
              <Field label={t("emailLabel")} htmlFor="email" error={emailErrors.email}>
                <Input id="email" type="email" autoComplete="email" {...registerEmail("email")} />
              </Field>
              <Field label={t("passwordLabel")} htmlFor="email-password" error={emailErrors.password}>
                <Input id="email-password" type="password" autoComplete="current-password" {...registerEmail("password")} />
              </Field>
              <Button type="submit" className="w-full" variant="secondary" disabled={isSubmitting}>
                {isSubmitting ? t("submitting") : t("submit")}
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
