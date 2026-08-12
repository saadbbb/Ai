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
import { saveOwnerNameAction } from "../actions/save-owner-name.action";
import { createOwnerNameSchema } from "../validation/schemas";
import { StepFooter } from "./step-footer";
import { StepShell } from "./step-shell";

type OwnerNameInput = z.infer<ReturnType<typeof createOwnerNameSchema>>;

export function OwnerNameForm({ defaultValues }: { defaultValues: Partial<OwnerNameInput> }) {
  const router = useRouter();
  const t = useTranslations("onboarding.ownerName");
  const tValidation = useTranslations("validation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OwnerNameInput>({ resolver: zodResolver(createOwnerNameSchema(tValidation)), defaultValues });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await saveOwnerNameAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push("/onboarding/business");
  });

  return (
    <StepShell step={1} title={t("title")} description={t("description")}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={t("nameLabel")} htmlFor="name" error={errors.name}>
          <Input id="name" placeholder={t("namePlaceholder")} {...register("name")} />
        </Field>
        <StepFooter isSubmitting={isSubmitting} />
      </form>
    </StepShell>
  );
}
