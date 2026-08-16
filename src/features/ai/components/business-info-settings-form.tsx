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
import { updateBusinessInfoAction } from "@/features/ai/actions/update-business-info.action";
import { BusinessTypeField } from "@/features/onboarding/components/business-type-field";
import { createWorkspaceProfileSchema } from "@/features/workspace/validation/profile-schemas";
import { SettingsCard } from "@/components/settings-card";

type WorkspaceProfileInput = z.infer<ReturnType<typeof createWorkspaceProfileSchema>>;

interface BusinessInfoSettingsFormProps {
  defaultValues: WorkspaceProfileInput;
}

export function BusinessInfoSettingsForm({ defaultValues }: BusinessInfoSettingsFormProps) {
  const t = useTranslations("onboarding.business");
  const tType = useTranslations("onboarding.businessType");
  const tProfile = useTranslations("workspaceProfile");
  const tSettings = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tValidation = useTranslations("validation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<WorkspaceProfileInput>({
    resolver: zodResolver(createWorkspaceProfileSchema(tValidation)),
    defaultValues,
  });

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

        <Field label={tType("fieldLabel")} htmlFor="businessType" error={errors.businessType}>
          <Controller
            control={control}
            name="businessType"
            render={({ field }) => <BusinessTypeField value={field.value} onChange={field.onChange} />}
          />
        </Field>

        <Field label={tProfile("logoUrlLabel")} htmlFor="logoUrl" error={errors.logoUrl}>
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
