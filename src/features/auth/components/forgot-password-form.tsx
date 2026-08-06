"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requestPasswordResetAction } from "../actions/forgot-password.action";
import { createRequestPasswordResetSchema } from "../validation/schemas";

type RequestResetInput = z.infer<ReturnType<typeof createRequestPasswordResetSchema>>;

export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgotPassword");
  const tValidation = useTranslations("validation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestResetInput>({ resolver: zodResolver(createRequestPasswordResetSchema(tValidation)) });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await requestPasswordResetAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setSent(true);
  });

  if (sent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("sentTitle")}</CardTitle>
          <CardDescription>{t("sentDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" className="text-sm font-medium text-foreground underline underline-offset-4">
            {t("backToLogin")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={t("emailLabel")} htmlFor="email" error={errors.email}>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
          </Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t("submitting") : t("submit")}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
              {t("backToLogin")}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
