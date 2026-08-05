"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { creativitySchema } from "@/features/ai/validation/schemas";
import { saveCreativityAction } from "../actions/save-creativity.action";
import { CREATIVITY_OPTIONS } from "../constants";
import { RadioOptionGroup } from "./radio-option-group";
import { StepFooter } from "./step-footer";
import { StepShell } from "./step-shell";

type CreativityInput = z.infer<typeof creativitySchema>;

export function CreativityForm({ defaultValues }: { defaultValues: Partial<CreativityInput> }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { handleSubmit, control } = useForm<CreativityInput>({
    resolver: zodResolver(creativitySchema),
    defaultValues: { creativity: "medium", ...defaultValues },
  });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await saveCreativityAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push("/onboarding/hours");
  });

  return (
    <StepShell step={6} title="How creative should your AI be?" description="This controls how much your AI varies its replies.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Controller
          control={control}
          name="creativity"
          render={({ field }) => (
            <RadioOptionGroup
              name="creativity"
              value={field.value}
              onValueChange={field.onChange}
              options={CREATIVITY_OPTIONS}
            />
          )}
        />
        <StepFooter backHref="/onboarding/tone" isSubmitting={isSubmitting} />
      </form>
    </StepShell>
  );
}
