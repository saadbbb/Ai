"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { creativityEnumSchema, creativitySchema } from "@/features/ai/validation/schemas";
import { saveCreativityAction } from "../actions/save-creativity.action";
import { RadioOptionGroup } from "./radio-option-group";
import { StepFooter } from "./step-footer";
import { StepShell } from "./step-shell";

type CreativityInput = z.infer<typeof creativitySchema>;

export function CreativityForm({ defaultValues }: { defaultValues: Partial<CreativityInput> }) {
  const router = useRouter();
  const t = useTranslations("onboarding.creativity");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { handleSubmit, control } = useForm<CreativityInput>({
    resolver: zodResolver(creativitySchema),
    defaultValues: { creativity: "medium", ...defaultValues },
  });

  const creativityOptions = creativityEnumSchema.options.map((value) => ({
    value,
    label: t(`options.${value}.label`),
    description: t(`options.${value}.description`),
  }));

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await saveCreativityAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push("/onboarding/hours");
  });

  return (
    <StepShell step={6} title={t("title")} description={t("description")}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Controller
          control={control}
          name="creativity"
          render={({ field }) => (
            <RadioOptionGroup
              name="creativity"
              value={field.value}
              onValueChange={field.onChange}
              options={creativityOptions}
            />
          )}
        />
        <StepFooter backHref="/onboarding/tone" isSubmitting={isSubmitting} />
      </form>
    </StepShell>
  );
}
