"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Field } from "@/components/form/field";
import { Input } from "@/components/ui/input";
import { saveBusinessInfoAction } from "../actions/save-business-info.action";
import { createBusinessInfoSchema } from "../validation/schemas";
import { StepFooter } from "./step-footer";
import { StepShell } from "./step-shell";

type BusinessInfoInput = z.infer<ReturnType<typeof createBusinessInfoSchema>>;

interface BusinessInfoFormProps {
  defaultValues: Partial<BusinessInfoInput>;
}

export function BusinessInfoForm({ defaultValues }: BusinessInfoFormProps) {
  const router = useRouter();
  const t = useTranslations("onboarding.business");
  const tValidation = useTranslations("validation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BusinessInfoInput>({
    resolver: zodResolver(createBusinessInfoSchema(tValidation)),
    defaultValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await saveBusinessInfoAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push("/onboarding/business-type");
  });

  return (
    <StepShell step={2} title={t("title")} description={t("description")}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={t("nameLabel")} htmlFor="name" error={errors.name}>
          <Input id="name" {...register("name")} />
        </Field>
        <StepFooter backHref="/onboarding/owner-name" isSubmitting={isSubmitting} />
      </form>
    </StepShell>
  );
}
