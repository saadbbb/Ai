"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resetUserPasswordAction } from "../actions/reset-user-password.action";

export function ResetPasswordButton({ userId }: { userId: string }) {
  const t = useTranslations("platformAdmin.workspaceDetail");
  const [isPending, startTransition] = useTransition();
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      const result = await resetUserPasswordAction({ userId });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      setTemporaryPassword(result.data.temporaryPassword);
      toast.success(t("passwordResetDone"));
    });
  }

  if (temporaryPassword) {
    return (
      <div className="space-y-1.5 rounded-lg border border-warning/40 bg-warning-soft p-3">
        <p className="text-xs font-semibold text-warning-foreground">{t("passwordResetInstructions")}</p>
        <code className="block rounded-md bg-background px-2 py-1.5 text-sm font-bold tracking-wide select-all">
          {temporaryPassword}
        </code>
      </div>
    );
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={handleClick} disabled={isPending}>
      {isPending ? t("resettingPassword") : t("resetPassword")}
    </Button>
  );
}
