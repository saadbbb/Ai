"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { responseLanguageSchema } from "@/features/ai/validation/schemas";
import { saveResponseLanguageAction } from "../actions/save-response-language.action";
import { LANGUAGE_OPTIONS } from "../constants";
import { RadioOptionGroup } from "./radio-option-group";
import { StepFooter } from "./step-footer";
import { StepShell } from "./step-shell";

type ResponseLanguageInput = z.infer<typeof responseLanguageSchema>;

export function ResponseLanguageForm({ defaultValues }: { defaultValues: Partial<ResponseLanguageInput> }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { handleSubmit, control } = useForm<ResponseLanguageInput>({
    resolver: zodResolver(responseLanguageSchema),
    defaultValues: { language: "en", ...defaultValues },
  });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await saveResponseLanguageAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push("/onboarding/tone");
  });

  return (
    <StepShell step={4} title="What language should your AI reply in?" description="This is the language your AI employee uses when talking to customers.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Controller
          control={control}
          name="language"
          render={({ field }) => (
            <RadioOptionGroup name="language" value={field.value} onValueChange={field.onChange} options={LANGUAGE_OPTIONS} />
          )}
        />
        <StepFooter backHref="/onboarding/description" isSubmitting={isSubmitting} />
      </form>
    </StepShell>
  );
}
