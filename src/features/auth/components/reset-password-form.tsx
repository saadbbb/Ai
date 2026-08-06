"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createSetNewPasswordSchema } from "../validation/schemas";

type SetNewPasswordInput = z.infer<ReturnType<typeof createSetNewPasswordSchema>>;

export function ResetPasswordForm({ validLink }: { validLink: boolean }) {
  const router = useRouter();
  const t = useTranslations("auth.resetPassword");
  const tValidation = useTranslations("validation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetNewPasswordInput>({ resolver: zodResolver(createSetNewPasswordSchema(tValidation)) });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(t("success"));
    router.push("/dashboard");
    router.refresh();
  });

  if (!validLink) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("invalidLinkTitle")}</CardTitle>
          <CardDescription>{t("invalidLinkDescription")}</CardDescription>
        </CardHeader>
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
          <Field label={t("passwordLabel")} htmlFor="password" error={errors.password}>
            <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
          </Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t("submitting") : t("submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
