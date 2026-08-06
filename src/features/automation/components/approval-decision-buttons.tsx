"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { decideApprovalAction } from "../actions/decide-approval.action";

export function ApprovalDecisionButtons({ approvalId }: { approvalId: string }) {
  const router = useRouter();
  const t = useTranslations("automations.approvals");
  const [isDeciding, setIsDeciding] = useState(false);

  async function decide(decision: "approved" | "rejected") {
    setIsDeciding(true);
    const result = await decideApprovalAction({ approvalId, decision });
    setIsDeciding(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex shrink-0 gap-2">
      <Button type="button" size="sm" disabled={isDeciding} onClick={() => decide("approved")}>
        {t("approve")}
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={isDeciding} onClick={() => decide("rejected")}>
        {t("reject")}
      </Button>
    </div>
  );
}
