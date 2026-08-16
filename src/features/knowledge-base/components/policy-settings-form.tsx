"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Field } from "@/components/form/field";
import { SettingsCard } from "@/components/settings-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updatePolicyAction } from "../actions/update-policy.action";
import { policyFormSchema } from "../validation/schemas";

type PolicyInput = z.infer<typeof policyFormSchema>;

interface PolicySettingsFormProps {
  defaultValues: PolicyInput;
}

export function PolicySettingsForm({ defaultValues }: PolicySettingsFormProps) {
  const t = useTranslations("onboarding.knowledgeBase");
  const tCommon = useTranslations("common");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit } = useForm<PolicyInput>({
    resolver: zodResolver(policyFormSchema),
    defaultValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await updatePolicyAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(tCommon("saved"));
  });

  return (
    <SettingsCard title={t("policiesHeading")}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={t("shippingLabel")} htmlFor="shippingPolicy">
          <Textarea id="shippingPolicy" rows={2} {...register("shippingPolicy")} />
        </Field>
        <Field label={t("returnsLabel")} htmlFor="returnsPolicy">
          <Textarea id="returnsPolicy" rows={2} {...register("returnsPolicy")} />
        </Field>
        <Field label={t("paymentsLabel")} htmlFor="paymentsPolicy">
          <Textarea id="paymentsPolicy" rows={2} {...register("paymentsPolicy")} />
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
