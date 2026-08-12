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
import { registerAction } from "../actions/register.action";
import { registerWithPhoneAction } from "../actions/register-with-phone.action";
import { EMAIL_PASSWORD_AUTH_ENABLED } from "../constants";
import { createPhoneSignUpSchema, createSignUpSchema } from "../validation/schemas";
import { GoogleSignInButton } from "./google-signin-button";

type PhoneSignUpInput = z.infer<ReturnType<typeof createPhoneSignUpSchema>>;
type SignUpInput = z.infer<ReturnType<typeof createSignUpSchema>>;

export function RegisterForm() {
  const router = useRouter();
  const t = useTranslations("auth.register");
  const tValidation = useTranslations("validation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register: registerPhone,
    handleSubmit: handlePhoneSubmit,
    formState: { errors: phoneErrors },
  } = useForm<PhoneSignUpInput>({ resolver: zodResolver(createPhoneSignUpSchema(tValidation)) });
  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors },
  } = useForm<SignUpInput>({ resolver: zodResolver(createSignUpSchema(tValidation)) });

  const onPhoneSubmit = handlePhoneSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await registerWithPhoneAction(values);
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
    const result = await registerAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    if (result.data.needsEmailConfirmation) {
      router.push(`/verify?email=${encodeURIComponent(values.email)}`);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
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
            <Input id="password" type="password" autoComplete="new-password" {...registerPhone("password")} />
          </Field>
          <Field label={t("confirmPasswordLabel")} htmlFor="confirmPassword" error={phoneErrors.confirmPassword}>
            <Input id="confirmPassword" type="password" autoComplete="new-password" {...registerPhone("confirmPassword")} />
          </Field>
          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input type="checkbox" className="mt-1 size-4 accent-primary" {...registerPhone("acceptTerms")} />
              <span>{t("acceptTerms")}</span>
            </label>
            {phoneErrors.acceptTerms && <p className="text-sm text-destructive">{phoneErrors.acceptTerms.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t("submitting") : t("submit")}
          </Button>
        </form>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          {t("haveAccount")}
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button asChild type="button" variant="outline" className="w-full">
          <Link href="/login">{t("login")}</Link>
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
                <Input id="email-password" type="password" autoComplete="new-password" {...registerEmail("password")} />
              </Field>
              <div className="space-y-2">
                <label className="flex items-start gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" className="mt-1 size-4 accent-primary" {...registerEmail("acceptTerms")} />
                  <span>{t("acceptTerms")}</span>
                </label>
                {emailErrors.acceptTerms && <p className="text-sm text-destructive">{emailErrors.acceptTerms.message}</p>}
              </div>
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
