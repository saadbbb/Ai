"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { toneSchema } from "@/features/ai/validation/schemas";
import { saveToneAction } from "../actions/save-tone.action";
import { TONE_OPTIONS } from "../constants";
import { RadioOptionGroup } from "./radio-option-group";
import { StepFooter } from "./step-footer";
import { StepShell } from "./step-shell";

type ToneInput = z.infer<typeof toneSchema>;

export function ToneForm({ defaultValues }: { defaultValues: Partial<ToneInput> }) {
  const router = useRouter();
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

    router.push("/onboarding/creativity");
  });

  return (
    <StepShell step={5} title="Choose your AI's tone" description="How should your AI employee sound when talking to customers?">
      <form onSubmit={onSubmit} className="space-y-4">
        <Controller
          control={control}
          name="tone"
          render={({ field }) => (
            <RadioOptionGroup name="tone" value={field.value} onValueChange={field.onChange} options={TONE_OPTIONS} />
          )}
        />
        <StepFooter backHref="/onboarding/language" isSubmitting={isSubmitting} />
      </form>
    </StepShell>
  );
}
