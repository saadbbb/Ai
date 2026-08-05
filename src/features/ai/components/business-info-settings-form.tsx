"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateBusinessInfoAction } from "@/features/ai/actions/update-business-info.action";
import { languageEnumSchema } from "@/features/ai/validation/schemas";
import { RadioOptionGroup } from "@/features/onboarding/components/radio-option-group";
import { BUSINESS_TYPE_KEYS } from "@/features/onboarding/constants";
import { createBusinessInfoSchema } from "@/features/onboarding/validation/schemas";
import { SettingsCard } from "./settings-card";

type BusinessInfoInput = z.infer<ReturnType<typeof createBusinessInfoSchema>>;

interface BusinessInfoSettingsFormProps {
  defaultValues: BusinessInfoInput;
}

export function BusinessInfoSettingsForm({ defaultValues }: BusinessInfoSettingsFormProps) {
  const t = useTranslations("onboarding.business");
  const tLanguages = useTranslations("onboarding.languages");
  const tSettings = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tValidation = useTranslations("validation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<BusinessInfoInput>({
    resolver: zodResolver(createBusinessInfoSchema(tValidation)),
    defaultValues,
  });

  const languageOptions = languageEnumSchema.options.map((value) => ({ value, label: tLanguages(value) }));

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await updateBusinessInfoAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(tCommon("saved"));
  });

  return (
    <SettingsCard title={tSettings("businessInfoTitle")} description={tSettings("businessInfoDescription")}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={t("nameLabel")} htmlFor="name" error={errors.name}>
          <Input id="name" {...register("name")} />
        </Field>

        <Field label={t("businessTypeLabel")} htmlFor="businessType" error={errors.businessType}>
          <Controller
            control={control}
            name="businessType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="businessType" className="w-full">
                  <SelectValue placeholder={t("businessTypePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPE_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {t(`businessTypes.${key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t("countryLabel")} htmlFor="country" error={errors.country}>
            <Input id="country" {...register("country")} />
          </Field>
          <Field label={t("timezoneLabel")} htmlFor="timezone" error={errors.timezone}>
            <Input id="timezone" {...register("timezone")} />
          </Field>
        </div>

        <Field label={t("languageLabel")} htmlFor="language" error={errors.language}>
          <Controller
            control={control}
            name="language"
            render={({ field }) => (
              <RadioOptionGroup name="language" value={field.value} onValueChange={field.onChange} options={languageOptions} />
            )}
          />
        </Field>

        <Field label={t("logoLabel")} htmlFor="logoUrl" error={errors.logoUrl}>
          <Input id="logoUrl" placeholder="https://..." {...register("logoUrl")} />
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
