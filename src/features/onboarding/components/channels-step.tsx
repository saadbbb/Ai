"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { completeOnboardingAction } from "../actions/complete-onboarding.action";
import { StepFooter } from "./step-footer";
import { StepShell } from "./step-shell";

export function ChannelsStep() {
  const router = useRouter();
  const t = useTranslations("onboarding.channels");
  const tCommon = useTranslations("common");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const channels = [
    { name: t("whatsappName"), description: t("whatsappDescription") },
    { name: t("instagramName"), description: t("instagramDescription") },
  ];

  async function handleFinish(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    const result = await completeOnboardingAction();
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(t("finishSuccess"));
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <StepShell step={10} title={t("title")} description={t("description")}>
      <form onSubmit={handleFinish} className="space-y-4">
        {channels.map((channel) => (
          <div
            key={channel.name}
            className="flex items-center justify-between rounded-lg border border-input px-3 py-2.5 opacity-60"
          >
            <div>
              <p className="text-sm font-medium">{channel.name}</p>
              <p className="text-xs text-muted-foreground">{channel.description}</p>
            </div>
            <Button type="button" variant="outline" size="sm" disabled>
              {tCommon("comingSoon")}
            </Button>
          </div>
        ))}

        <StepFooter
          backHref="/onboarding/knowledge-base"
          isSubmitting={isSubmitting}
          continueLabel={tCommon("finishSetup")}
        />
      </form>
    </StepShell>
  );
}
