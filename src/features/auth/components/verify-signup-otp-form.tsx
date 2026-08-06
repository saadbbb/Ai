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
import { resendSignupOtpAction } from "../actions/resend-signup-otp.action";
import { verifySignupOtpAction } from "../actions/verify-signup-otp.action";
import { createOtpCodeSchema } from "../validation/schemas";

export function VerifySignupOtpForm({ email }: { email: string }) {
  const router = useRouter();
  const t = useTranslations("auth.verify");
  const tValidation = useTranslations("validation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const schema = z.object({ code: createOtpCodeSchema(tValidation) });
  type CodeInput = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CodeInput>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await verifySignupOtpAction({ email, code: values.code });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(t("success"));
    router.push("/dashboard");
    router.refresh();
  });

  async function handleResend() {
    setIsResending(true);
    const result = await resendSignupOtpAction({ email });
    setIsResending(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(t("resendSuccess"));
  }

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("otpTitle")}</CardTitle>
        <CardDescription>{t("otpDescription", { email })}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={t("codeLabel")} htmlFor="code" error={errors.code}>
            <Input id="code" inputMode="numeric" maxLength={10} autoComplete="one-time-code" {...register("code")} />
          </Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t("verifying") : t("verify")}
          </Button>
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50"
          >
            {isResending ? t("resending") : t("resendCode")}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
