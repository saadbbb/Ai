"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { updateHandoverAction } from "../actions/update-handover.action";
import { handoverSchema } from "../validation/schemas";
import { SettingsCard } from "./settings-card";

type HandoverInput = z.infer<typeof handoverSchema>;

interface HandoverSettingsFormProps {
  defaultValues: HandoverInput;
}

export function HandoverSettingsForm({ defaultValues }: HandoverSettingsFormProps) {
  const t = useTranslations("onboarding.handover");
  const tSettings = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    watch,
  } = useForm<HandoverInput>({ resolver: zodResolver(handoverSchema), defaultValues });

  const handoverEnabled = watch("handoverEnabled");

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
            <div className="flex items-center gap-2">
              <Switch id="handoverEnabled" checked={field.value} onCheckedChange={field.onChange} />
              <Label htmlFor="handoverEnabled">{t("enableLabel")}</Label>
            </div>
          )}
        />

        <Field label={t("instructionsLabel")} htmlFor="handoverInstructions">
          <Textarea
            id="handoverInstructions"
            placeholder={t("instructionsPlaceholder")}
            disabled={!handoverEnabled}
            {...register("handoverInstructions")}
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
