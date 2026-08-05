"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Field } from "@/components/form/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { WEEKDAY_KEYS } from "@/features/ai/constants";
import { workingHoursSchema } from "@/features/ai/validation/schemas";
import { saveWorkingHoursAction } from "../actions/save-working-hours.action";
import { StepFooter } from "./step-footer";
import { StepShell } from "./step-shell";

type WorkingHoursInput = z.infer<typeof workingHoursSchema>;

export function WorkingHoursForm({ defaultValues }: { defaultValues: WorkingHoursInput }) {
  const router = useRouter();
  const t = useTranslations("onboarding.hours");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    watch,
  } = useForm<WorkingHoursInput>({ resolver: zodResolver(workingHoursSchema), defaultValues });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await saveWorkingHoursAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push("/onboarding/handover");
  });

  return (
    <StepShell step={7} title={t("title")} description={t("description")}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={t("timezoneLabel")} htmlFor="timezone">
          <Input id="timezone" placeholder="Asia/Baghdad" {...register("timezone")} />
        </Field>

        <div className="space-y-2">
          {WEEKDAY_KEYS.map((day) => {
            const closed = watch(`schedule.${day}.closed`);
            return (
              <div key={day} className="flex items-center gap-3 rounded-lg border border-input px-3 py-2">
                <span className="w-24 shrink-0 text-sm font-medium">{t(`weekdays.${day}`)}</span>
                <Controller
                  control={control}
                  name={`schedule.${day}.closed`}
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <Switch id={`${day}-closed`} checked={field.value} onCheckedChange={field.onChange} />
                      <Label htmlFor={`${day}-closed`} className="text-xs text-muted-foreground">
                        {t("closedLabel")}
                      </Label>
                    </div>
                  )}
                />
                <Input type="time" disabled={closed} {...register(`schedule.${day}.open`)} />
                <span className="text-muted-foreground">–</span>
                <Input type="time" disabled={closed} {...register(`schedule.${day}.close`)} />
              </div>
            );
          })}
        </div>

        <Field label={t("holidayNotesLabel")} htmlFor="holidayNotes">
          <Textarea id="holidayNotes" placeholder={t("holidayNotesPlaceholder")} {...register("holidayNotes")} />
        </Field>

        <StepFooter backHref="/onboarding/creativity" isSubmitting={isSubmitting} />
      </form>
    </StepShell>
  );
}
