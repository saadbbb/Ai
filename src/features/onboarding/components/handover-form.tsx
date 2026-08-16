"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { handoverSchema } from "@/features/ai/validation/schemas";
import { saveHandoverAction } from "../actions/save-handover.action";
import { HandoverFields } from "./handover-fields";
import { StepFooter } from "./step-footer";
import { StepShell } from "./step-shell";

type HandoverInput = z.infer<typeof handoverSchema>;

export function HandoverForm({ defaultValues }: { defaultValues: HandoverInput }) {
  const router = useRouter();
  const t = useTranslations("onboarding.handover");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, control } = useForm<HandoverInput>({
    resolver: zodResolver(handoverSchema),
    defaultValues,
  });

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
            <HandoverFields enabled={field.value} onEnabledChange={field.onChange} register={register} />
          )}
        />

        <StepFooter backHref="/onboarding/tone" isSubmitting={isSubmitting} />
      </form>
    </StepShell>
  );
}
