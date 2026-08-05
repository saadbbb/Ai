"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { WEEKDAYS } from "@/features/ai/constants";
import { workingHoursSchema } from "@/features/ai/validation/schemas";
import { saveWorkingHoursAction } from "../actions/save-working-hours.action";
import { StepFooter } from "./step-footer";
import { StepShell } from "./step-shell";

type WorkingHoursInput = z.infer<typeof workingHoursSchema>;

export function WorkingHoursForm({ defaultValues }: { defaultValues: WorkingHoursInput }) {
  const router = useRouter();
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
    <StepShell
      step={7}
      title="Set your working hours"
      description="Your AI can let customers know when the team is available."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Timezone" htmlFor="timezone">
          <Input id="timezone" placeholder="Asia/Baghdad" {...register("timezone")} />
        </Field>

        <div className="space-y-2">
          {WEEKDAYS.map((day) => {
            const closed = watch(`schedule.${day.key}.closed`);
            return (
              <div key={day.key} className="flex items-center gap-3 rounded-lg border border-input px-3 py-2">
                <span className="w-24 shrink-0 text-sm font-medium">{day.label}</span>
                <Controller
                  control={control}
                  name={`schedule.${day.key}.closed`}
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <Switch id={`${day.key}-closed`} checked={field.value} onCheckedChange={field.onChange} />
                      <Label htmlFor={`${day.key}-closed`} className="text-xs text-muted-foreground">
                        Closed
                      </Label>
                    </div>
                  )}
                />
                <Input type="time" disabled={closed} {...register(`schedule.${day.key}.open`)} />
                <span className="text-muted-foreground">–</span>
                <Input type="time" disabled={closed} {...register(`schedule.${day.key}.close`)} />
              </div>
            );
          })}
        </div>

        <Field label="Holiday / closed-date notes (optional)" htmlFor="holidayNotes">
          <Textarea id="holidayNotes" placeholder="e.g. Closed on public holidays" {...register("holidayNotes")} />
        </Field>

        <StepFooter backHref="/onboarding/creativity" isSubmitting={isSubmitting} />
      </form>
    </StepShell>
  );
}
