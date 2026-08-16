"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { updateHandoverAction } from "../actions/update-handover.action";
import { handoverSchema } from "../validation/schemas";
import { HandoverFields } from "@/features/onboarding/components/handover-fields";
import { SettingsCard } from "@/components/settings-card";

type HandoverInput = z.infer<typeof handoverSchema>;

interface HandoverSettingsFormProps {
  defaultValues: HandoverInput;
}

export function HandoverSettingsForm({ defaultValues }: HandoverSettingsFormProps) {
  const tSettings = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, control } = useForm<HandoverInput>({
    resolver: zodResolver(handoverSchema),
    defaultValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await updateHandoverAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(tCommon("saved"));
  });

  return (
    <SettingsCard title={tSettings("handoverTitle")} description={tSettings("handoverDescription")}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Controller
          control={control}
          name="handoverEnabled"
          render={({ field }) => (
            <HandoverFields enabled={field.value} onEnabledChange={field.onChange} register={register} />
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? tCommon("saving") : tCommon("save")}
          </Button>
        </div>
      </form>
    </SettingsCard>
  );
}
