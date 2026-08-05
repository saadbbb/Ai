"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { updatePersonalityAction } from "../actions/update-personality.action";
import { creativityEnumSchema, languageEnumSchema, personalitySchema, toneEnumSchema } from "../validation/schemas";
import { RadioOptionGroup } from "@/features/onboarding/components/radio-option-group";
import { SettingsCard } from "./settings-card";

type PersonalityInput = z.infer<typeof personalitySchema>;

interface PersonalitySettingsFormProps {
  defaultValues: PersonalityInput;
}

export function PersonalitySettingsForm({ defaultValues }: PersonalitySettingsFormProps) {
  const tLanguage = useTranslations("onboarding.language");
  const tLanguages = useTranslations("onboarding.languages");
  const tTone = useTranslations("onboarding.tone");
  const tCreativity = useTranslations("onboarding.creativity");
  const tSettings = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { handleSubmit, control } = useForm<PersonalityInput>({
    resolver: zodResolver(personalitySchema),
    defaultValues,
  });

  const languageOptions = languageEnumSchema.options.map((value) => ({ value, label: tLanguages(value) }));
  const toneOptions = toneEnumSchema.options.map((value) => ({ value, label: tTone(`options.${value}`) }));
  const creativityOptions = creativityEnumSchema.options.map((value) => ({
    value,
    label: tCreativity(`options.${value}.label`),
    description: tCreativity(`options.${value}.description`),
  }));

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await updatePersonalityAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(tCommon("saved"));
  });

  return (
    <SettingsCard title={tSettings("personalityTitle")} description={tSettings("personalityDescription")}>
      <form onSubmit={onSubmit} className="space-y-6">
        <Field label={tLanguage("title")} htmlFor="language">
          <Controller
            control={control}
            name="language"
            render={({ field }) => (
              <RadioOptionGroup name="language" value={field.value} onValueChange={field.onChange} options={languageOptions} />
            )}
          />
        </Field>

        <Field label={tTone("title")} htmlFor="tone">
          <Controller
            control={control}
            name="tone"
            render={({ field }) => (
              <RadioOptionGroup name="tone" value={field.value} onValueChange={field.onChange} options={toneOptions} />
            )}
          />
        </Field>

        <Field label={tCreativity("title")} htmlFor="creativity">
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
        </Field>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? tCommon("saving") : tCommon("save")}
          </Button>
        </div>
      </form>
    </SettingsCard>
  );
}
