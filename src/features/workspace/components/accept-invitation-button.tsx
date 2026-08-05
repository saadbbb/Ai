"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acceptInvitationAction } from "../actions/accept-invitation.action";

export function AcceptInvitationButton({ token }: { token: string }) {
  const router = useRouter();
  const t = useTranslations("team.accept");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAccept() {
    setIsSubmitting(true);
    const result = await acceptInvitationAction({ token });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(t("accepted"));
    router.push("/dashboard");
  }

  return (
    <Button type="button" size="lg" disabled={isSubmitting} onClick={handleAccept}>
      {isSubmitting ? t("accepting") : t("acceptButton")}
    </Button>
  );
}
