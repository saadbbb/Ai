"use client";

import { useTranslations } from "next-intl";
import type { UseFormRegister } from "react-hook-form";
import type { z } from "zod";
import { Field } from "@/components/form/field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { handoverSchema } from "@/features/ai/validation/schemas";

type HandoverInput = z.infer<typeof handoverSchema>;

/**
 * The handover toggle + instructions body shared by the onboarding wizard's Handover
 * step and the AI Employee settings Handover tab — same fields (ai_agents.handoverEnabled/
 * handoverInstructions), same markup. Each caller keeps its own form/submit wiring.
 */
export function HandoverFields({
  enabled,
  onEnabledChange,
  register,
}: {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  register: UseFormRegister<HandoverInput>;
}) {
  const t = useTranslations("onboarding.handover");

  return (
    <>
      <div className="flex items-center gap-2">
        <Switch id="handoverEnabled" checked={enabled} onCheckedChange={onEnabledChange} />
        <Label htmlFor="handoverEnabled">{t("enableLabel")}</Label>
      </div>

      <Field label={t("instructionsLabel")} htmlFor="handoverInstructions">
        <Textarea
          id="handoverInstructions"
          placeholder={t("instructionsPlaceholder")}
          disabled={!enabled}
          {...register("handoverInstructions")}
        />
      </Field>
    </>
  );
}
