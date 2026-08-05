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
import { createRegisterSchema } from "../validation/schemas";

type RegisterInput = z.infer<ReturnType<typeof createRegisterSchema>>;

export function RegisterForm() {
  const router = useRouter();
  const t = useTranslations("auth.register");
  const tValidation = useTranslations("validation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(createRegisterSchema(tValidation)) });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await registerAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push(`/verify?email=${encodeURIComponent(values.email)}`);
  });

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
            {t("haveAccount")}{" "}
            <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
              {t("login")}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
