"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateAgentProfileAction } from "../actions/update-agent-profile.action";
import { createAgentProfileSchema } from "../validation/schemas";
import { SettingsCard } from "@/components/settings-card";

type AgentProfileInput = z.infer<ReturnType<typeof createAgentProfileSchema>>;

interface AgentProfileSettingsFormProps {
  defaultValues: AgentProfileInput;
}

export function AgentProfileSettingsForm({ defaultValues }: AgentProfileSettingsFormProps) {
  const tAgentName = useTranslations("onboarding.agentName");
  const tDescription = useTranslations("onboarding.description");
  const tSettings = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tValidation = useTranslations("validation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AgentProfileInput>({
    resolver: zodResolver(createAgentProfileSchema(tValidation)),
    defaultValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await updateAgentProfileAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(tCommon("saved"));
  });

  return (
    <SettingsCard title={tSettings("agentProfileTitle")} description={tSettings("agentProfileDescription")}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={tAgentName("nameLabel")} htmlFor="name" error={errors.name}>
          <Input id="name" {...register("name")} />
        </Field>
        <Field label={tDescription("label")} htmlFor="businessDescription" error={errors.businessDescription}>
          <Textarea id="businessDescription" rows={6} {...register("businessDescription")} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? tCommon("saving") : tCommon("save")}
          </Button>
        </div>
      </form>
    </SettingsCard>
  );
}
