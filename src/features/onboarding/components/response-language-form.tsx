"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { languageEnumSchema, responseLanguageSchema } from "@/features/ai/validation/schemas";
import { saveResponseLanguageAction } from "../actions/save-response-language.action";
import { RadioOptionGroup } from "./radio-option-group";
import { StepFooter } from "./step-footer";
import { StepShell } from "./step-shell";

type ResponseLanguageInput = z.infer<typeof responseLanguageSchema>;

export function ResponseLanguageForm({ defaultValues }: { defaultValues: Partial<ResponseLanguageInput> }) {
  const router = useRouter();
  const t = useTranslations("onboarding.language");
  const tLanguages = useTranslations("onboarding.languages");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { handleSubmit, control } = useForm<ResponseLanguageInput>({
    resolver: zodResolver(responseLanguageSchema),
    defaultValues: { language: "en", ...defaultValues },
  });

  const languageOptions = languageEnumSchema.options.map((value) => ({ value, label: tLanguages(value) }));

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await saveResponseLanguageAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push("/onboarding/tone");
  });

  return (
    <StepShell step={4} title={t("title")} description={t("description")}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Controller
          control={control}
          name="language"
          render={({ field }) => (
            <RadioOptionGroup name="language" value={field.value} onValueChange={field.onChange} options={languageOptions} />
          )}
        />
        <StepFooter backHref="/onboarding/description" isSubmitting={isSubmitting} />
      </form>
    </StepShell>
  );
}
