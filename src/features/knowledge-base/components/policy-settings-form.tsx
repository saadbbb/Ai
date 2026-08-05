"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle>{t("policiesHeading")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <Textarea placeholder={t("shippingPlaceholder")} {...register("shippingPolicy")} />
          <Textarea placeholder={t("returnsPlaceholder")} {...register("returnsPolicy")} />
          <Textarea placeholder={t("paymentsPlaceholder")} {...register("paymentsPolicy")} />
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tCommon("saving") : tCommon("save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
