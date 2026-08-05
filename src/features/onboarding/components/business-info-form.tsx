"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Field } from "@/components/form/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveBusinessInfoAction } from "../actions/save-business-info.action";
import { BUSINESS_TYPES, LANGUAGE_OPTIONS } from "../constants";
import { businessInfoSchema } from "../validation/schemas";
import { RadioOptionGroup } from "./radio-option-group";
import { StepFooter } from "./step-footer";
import { StepShell } from "./step-shell";

type BusinessInfoInput = z.infer<typeof businessInfoSchema>;

interface BusinessInfoFormProps {
  defaultValues: Partial<BusinessInfoInput>;
}

export function BusinessInfoForm({ defaultValues }: BusinessInfoFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<BusinessInfoInput>({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: { language: "en", ...defaultValues },
  });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await saveBusinessInfoAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push("/onboarding/agent-name");
  });

  return (
    <StepShell
      step={1}
      title="Tell us about your business"
      description="This helps your AI employee introduce your business correctly."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Business name" htmlFor="name" error={errors.name}>
          <Input id="name" {...register("name")} />
        </Field>

        <Field label="Business type" htmlFor="businessType" error={errors.businessType}>
          <Controller
            control={control}
            name="businessType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="businessType" className="w-full">
                  <SelectValue placeholder="Select a business type" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Country" htmlFor="country" error={errors.country}>
            <Input id="country" {...register("country")} />
          </Field>
          <Field label="Timezone" htmlFor="timezone" error={errors.timezone}>
            <Input id="timezone" placeholder="Asia/Baghdad" {...register("timezone")} />
          </Field>
        </div>

        <Field label="Dashboard language" htmlFor="language" error={errors.language}>
          <Controller
            control={control}
            name="language"
            render={({ field }) => (
              <RadioOptionGroup name="language" value={field.value} onValueChange={field.onChange} options={LANGUAGE_OPTIONS} />
            )}
          />
        </Field>

        <Field label="Logo URL (optional)" htmlFor="logoUrl" error={errors.logoUrl}>
          <Input id="logoUrl" placeholder="https://..." {...register("logoUrl")} />
        </Field>

        <StepFooter isSubmitting={isSubmitting} />
      </form>
    </StepShell>
  );
}
