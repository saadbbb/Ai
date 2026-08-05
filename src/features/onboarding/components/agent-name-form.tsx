"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
    <StepShell
      step={2}
      title="Create your AI employee"
      description="Give your AI employee a name — this is who your customers will be talking to."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="AI employee name" htmlFor="name" error={errors.name}>
          <Input id="name" placeholder="Sara, Ahmed, Sales Assistant..." {...register("name")} />
        </Field>
        <StepFooter backHref="/onboarding/business" isSubmitting={isSubmitting} />
      </form>
    </StepShell>
  );
}
