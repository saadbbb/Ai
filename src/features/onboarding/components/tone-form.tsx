"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { toneSchema } from "@/features/ai/validation/schemas";
import { saveToneAction } from "../actions/save-tone.action";
import { StepFooter } from "./step-footer";
import { StepShell } from "./step-shell";
import { ToneField } from "./tone-field";

type ToneInput = z.infer<typeof toneSchema>;

export function ToneForm({ defaultValues }: { defaultValues: Partial<ToneInput> }) {
  const router = useRouter();
  const t = useTranslations("onboarding.tone");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { handleSubmit, control } = useForm<ToneInput>({
    resolver: zodResolver(toneSchema),
    defaultValues: { tone: "friendly", ...defaultValues },
  });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await saveToneAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push("/onboarding/handover");
  });

  return (
    <StepShell step={7} title={t("title")} description={t("description")}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Controller
          control={control}
          name="tone"
          render={({ field }) => <ToneField value={field.value} onChange={field.onChange} />}
        />
        <StepFooter backHref="/onboarding/description" isSubmitting={isSubmitting} />
      </form>
    </StepShell>
  );
}
