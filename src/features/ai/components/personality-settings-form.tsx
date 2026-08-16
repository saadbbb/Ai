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
import { toneSchema } from "../validation/schemas";
import { ToneField } from "@/features/onboarding/components/tone-field";
import { SettingsCard } from "@/components/settings-card";

type ToneInput = z.infer<typeof toneSchema>;

interface PersonalitySettingsFormProps {
  defaultValues: ToneInput;
}

export function PersonalitySettingsForm({ defaultValues }: PersonalitySettingsFormProps) {
  const tTone = useTranslations("onboarding.tone");
  const tSettings = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { handleSubmit, control } = useForm<ToneInput>({
    resolver: zodResolver(toneSchema),
    defaultValues,
  });

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
        <Field label={tTone("title")} htmlFor="tone">
          <Controller
            control={control}
            name="tone"
            render={({ field }) => <ToneField value={field.value} onChange={field.onChange} />}
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
