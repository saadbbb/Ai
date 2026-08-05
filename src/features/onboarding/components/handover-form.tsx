"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Field } from "@/components/form/field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { handoverSchema } from "@/features/ai/validation/schemas";
import { saveHandoverAction } from "../actions/save-handover.action";
import { StepFooter } from "./step-footer";
import { StepShell } from "./step-shell";

type HandoverInput = z.infer<typeof handoverSchema>;

export function HandoverForm({ defaultValues }: { defaultValues: HandoverInput }) {
  const router = useRouter();
  const t = useTranslations("onboarding.handover");
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
    const result = await saveHandoverAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push("/onboarding/knowledge-base");
  });

  return (
    <StepShell step={8} title={t("title")} description={t("description")}>
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

        <StepFooter backHref="/onboarding/hours" isSubmitting={isSubmitting} />
      </form>
    </StepShell>
  );
}
