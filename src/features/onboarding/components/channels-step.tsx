"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { completeOnboardingAction } from "../actions/complete-onboarding.action";
import { StepFooter } from "./step-footer";
import { StepShell } from "./step-shell";

const CHANNELS = [
  { name: "WhatsApp Business", description: "Answer customers on WhatsApp automatically." },
  { name: "Instagram DM", description: "Answer customers on Instagram automatically." },
];

export function ChannelsStep() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleFinish(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    const result = await completeOnboardingAction();
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success("Your AI employee is ready!");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <StepShell
      step={10}
      title="Connect your channels"
      description="Connect WhatsApp and Instagram so your AI employee can start replying. You can also do this later from settings."
    >
      <form onSubmit={handleFinish} className="space-y-4">
        {CHANNELS.map((channel) => (
          <div
            key={channel.name}
            className="flex items-center justify-between rounded-lg border border-input px-3 py-2.5 opacity-60"
          >
            <div>
              <p className="text-sm font-medium">{channel.name}</p>
              <p className="text-xs text-muted-foreground">{channel.description}</p>
            </div>
            <Button type="button" variant="outline" size="sm" disabled>
              Coming soon
            </Button>
          </div>
        ))}

        <StepFooter backHref="/onboarding/knowledge-base" isSubmitting={isSubmitting} continueLabel="Finish setup" />
      </form>
    </StepShell>
  );
}
