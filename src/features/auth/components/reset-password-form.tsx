"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { resetPasswordAction } from "../actions/reset-password.action";
import { verifyPasswordResetOtpAction } from "../actions/verify-otp.action";

export function ResetPasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const t = useTranslations("auth.resetPassword");
  const tValidation = useTranslations("validation");
  const [step, setStep] = useState<"otp" | "password">("otp");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const otpStepSchema = z.object({ code: z.string().length(6, tValidation("codeLength")) });
  const passwordStepSchema = z.object({ password: z.string().min(8, tValidation("passwordMin")) });

  type OtpStepInput = z.infer<typeof otpStepSchema>;
  type PasswordStepInput = z.infer<typeof passwordStepSchema>;

  const otpForm = useForm<OtpStepInput>({ resolver: zodResolver(otpStepSchema) });
  const passwordForm = useForm<PasswordStepInput>({ resolver: zodResolver(passwordStepSchema) });

  const onSubmitOtp = otpForm.handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await verifyPasswordResetOtpAction({ email, code: values.code });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setStep("password");
  });

  const onSubmitPassword = passwordForm.handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await resetPasswordAction({ email, password: values.password });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(t("success"));
    router.push("/login");
  });

  if (!email) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("missingEmailTitle")}</CardTitle>
          <CardDescription>{t("missingEmailDescription")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (step === "otp") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("otpTitle")}</CardTitle>
          <CardDescription>{t("otpDescription", { email })}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmitOtp} className="space-y-4">
            <Field label={t("codeLabel")} htmlFor="code" error={otpForm.formState.errors.code}>
              <Input id="code" inputMode="numeric" maxLength={6} {...otpForm.register("code")} />
            </Field>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t("verifying") : t("verify")}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("passwordTitle")}</CardTitle>
        <CardDescription>{t("passwordDescription", { email })}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmitPassword} className="space-y-4">
          <Field label={t("passwordLabel")} htmlFor="password" error={passwordForm.formState.errors.password}>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...passwordForm.register("password")}
            />
          </Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t("submitting") : t("submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
