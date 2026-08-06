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
import { EMAIL_PASSWORD_AUTH_ENABLED } from "../constants";
import { createSignUpSchema } from "../validation/schemas";
import { GoogleSignInButton } from "./google-signin-button";

type SignUpInput = z.infer<ReturnType<typeof createSignUpSchema>>;

export function RegisterForm() {
  const router = useRouter();
  const t = useTranslations("auth.register");
  const tValidation = useTranslations("validation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({ resolver: zodResolver(createSignUpSchema(tValidation)) });

  const onSubmit = handleSubmit(async (values) => {
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
                <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
              </Field>
              <div className="space-y-2">
                <label className="flex items-start gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" className="mt-1" {...register("acceptTerms")} />
                  <span>{t("acceptTerms")}</span>
                </label>
                {errors.acceptTerms && <p className="text-sm text-destructive">{errors.acceptTerms.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t("submitting") : t("submit")}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {t("haveAccount")}{" "}
                <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
                  {t("login")}
                </Link>
              </p>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
