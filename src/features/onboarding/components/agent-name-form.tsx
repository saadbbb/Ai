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
import { agentNameSchema } from "@/features/ai/validation/schemas";
import { saveAgentNameAction } from "../actions/save-agent-name.action";
import { StepFooter } from "./step-footer";
import { StepShell } from "./step-shell";

type AgentNameInput = z.infer<typeof agentNameSchema>;

export function AgentNameForm({ defaultValues }: { defaultValues: Partial<AgentNameInput> }) {
  const router = useRouter();
  const t = useTranslations("onboarding.agentName");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AgentNameInput>({ resolver: zodResolver(agentNameSchema), defaultValues });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await saveAgentNameAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push("/onboarding/description");
  });

  return (
    <StepShell step={5} title={t("title")} description={t("description")}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={t("nameLabel")} htmlFor="name" error={errors.name}>
          <Input id="name" placeholder={t("namePlaceholder")} {...register("name")} />
        </Field>
        <StepFooter backHref="/onboarding/logo" isSubmitting={isSubmitting} />
      </form>
    </StepShell>
  );
}
