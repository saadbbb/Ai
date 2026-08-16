"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Field } from "@/components/form/field";
import { saveBusinessTypeAction } from "../actions/save-business-type.action";
import { createBusinessTypeSchema } from "../validation/schemas";
import { BusinessTypeField } from "./business-type-field";
import { StepFooter } from "./step-footer";
import { StepShell } from "./step-shell";

type BusinessTypeInput = z.infer<ReturnType<typeof createBusinessTypeSchema>>;

export function BusinessTypeForm({ defaultValues }: { defaultValues: Partial<BusinessTypeInput> }) {
  const router = useRouter();
  const t = useTranslations("onboarding.businessType");
  const tValidation = useTranslations("validation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<BusinessTypeInput>({ resolver: zodResolver(createBusinessTypeSchema(tValidation)), defaultValues });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await saveBusinessTypeAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push("/onboarding/logo");
  });

  return (
    <StepShell step={3} title={t("title")} description={t("description")}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={t("fieldLabel")} htmlFor="businessType" error={errors.businessType}>
          <Controller
            control={control}
            name="businessType"
            render={({ field }) => <BusinessTypeField value={field.value} onChange={field.onChange} />}
          />
        </Field>
        <StepFooter backHref="/onboarding/business" isSubmitting={isSubmitting} />
      </form>
    </StepShell>
  );
}
