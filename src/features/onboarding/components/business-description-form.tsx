"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Field } from "@/components/form/field";
import { Textarea } from "@/components/ui/textarea";
import { createBusinessDescriptionSchema } from "@/features/ai/validation/schemas";
import { saveBusinessDescriptionAction } from "../actions/save-business-description.action";
import { StepFooter } from "./step-footer";
import { StepShell } from "./step-shell";

type BusinessDescriptionInput = z.infer<ReturnType<typeof createBusinessDescriptionSchema>>;

export function BusinessDescriptionForm({ defaultValues }: { defaultValues: Partial<BusinessDescriptionInput> }) {
  const router = useRouter();
  const t = useTranslations("onboarding.description");
  const tValidation = useTranslations("validation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BusinessDescriptionInput>({
    resolver: zodResolver(createBusinessDescriptionSchema(tValidation)),
    defaultValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await saveBusinessDescriptionAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push("/onboarding/language");
  });

  return (
    <StepShell step={3} title={t("title")} description={t("description")}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={t("label")} htmlFor="businessDescription" error={errors.businessDescription}>
          <Textarea id="businessDescription" rows={8} {...register("businessDescription")} />
        </Field>
        <StepFooter backHref="/onboarding/agent-name" isSubmitting={isSubmitting} />
      </form>
    </StepShell>
  );
}
