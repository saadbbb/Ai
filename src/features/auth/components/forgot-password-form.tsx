"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requestPasswordResetAction } from "../actions/forgot-password.action";
import { verifyRecoveryOtpAction } from "../actions/verify-recovery-otp.action";
import { createOtpCodeSchema, createRequestPasswordResetSchema } from "../validation/schemas";

type RequestResetInput = z.infer<ReturnType<typeof createRequestPasswordResetSchema>>;

export function ForgotPasswordForm() {
  const router = useRouter();
  const t = useTranslations("auth.forgotPassword");
  const tValidation = useTranslations("validation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [email, setEmail] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestResetInput>({ resolver: zodResolver(createRequestPasswordResetSchema(tValidation)) });

  const otpSchema = z.object({ code: createOtpCodeSchema(tValidation) });
  type OtpInput = z.infer<typeof otpSchema>;
  const otpForm = useForm<OtpInput>({ resolver: zodResolver(otpSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await requestPasswordResetAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setEmail(values.email);
  });

  const onSubmitOtp = otpForm.handleSubmit(async (values) => {
    setIsVerifying(true);
    const result = await verifyRecoveryOtpAction({ email, code: values.code });
    setIsVerifying(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push("/reset-password");
  });

  if (email) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("otpTitle")}</CardTitle>
          <CardDescription>{t("otpDescription", { email })}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmitOtp} className="space-y-4">
            <Field label={t("codeLabel")} htmlFor="code" error={otpForm.formState.errors.code}>
              <Input id="code" inputMode="numeric" maxLength={10} autoComplete="one-time-code" {...otpForm.register("code")} />
            </Field>
            <Button type="submit" className="w-full" disabled={isVerifying}>
              {isVerifying ? t("verifying") : t("verify")}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("title")}</CardTitle>
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
