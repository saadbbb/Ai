"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Plan, Workspace } from "@/db/schema";
import { activateSubscriptionAction } from "../actions/activate-subscription.action";
import { WorkspaceSubscriptionSelect } from "./workspace-subscription-select";

export function WorkspaceRow({
  workspace,
  ownerEmail,
  initialPlan,
  allPlans,
  canImpersonate,
}: {
  workspace: Workspace;
  ownerEmail: string | null;
  initialPlan: Plan | null;
  allPlans: Plan[];
  canImpersonate: boolean;
}) {
  const t = useTranslations("platformAdmin.workspaces");
  const [plan, setPlan] = useState(initialPlan);
  const [expiresAt, setExpiresAt] = useState(workspace.subscriptionExpiresAt);
  const [status, setStatus] = useState(workspace.subscriptionStatus);
  const [isActivating, setIsActivating] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(allPlans[0]?.id ?? "");
  const [days, setDays] = useState(String(allPlans[0]?.defaultDurationDays ?? 30));
  const [isSaving, setIsSaving] = useState(false);

  const formatter = new Intl.DateTimeFormat("en-GB", { timeZone: workspace.timezone, dateStyle: "medium" });

  function handlePlanSelect(planId: string) {
    setSelectedPlanId(planId);
    const selected = allPlans.find((p) => p.id === planId);
    if (selected) setDays(String(selected.defaultDurationDays));
  }

  async function handleActivate() {
    if (!selectedPlanId) return;

    setIsSaving(true);
    const result = await activateSubscriptionAction({
      workspaceId: workspace.id,
      planId: selectedPlanId,
      days,
    });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setPlan(allPlans.find((p) => p.id === selectedPlanId) ?? null);
    setExpiresAt(result.data.subscriptionExpiresAt);
    setStatus(result.data.subscriptionStatus);
    setIsActivating(false);
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-medium">{workspace.name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {ownerEmail ?? t("noOwner")} · {new Date(workspace.createdAt).toISOString().slice(0, 10)}
          </p>
          {plan && (
            <p className="text-xs text-muted-foreground">
              {t("planSummary", { plan: plan.name })}
              {expiresAt && ` · ${t("expiresOn", { date: formatter.format(new Date(expiresAt)) })}`}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canImpersonate && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/admin/workspaces/${workspace.id}/view`}>{t("view")}</Link>
            </Button>
          )}
          <div className="w-36">
            <WorkspaceSubscriptionSelect
              key={status}
              workspaceId={workspace.id}
              initialStatus={status}
              onChange={setStatus}
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setIsActivating((current) => !current)}>
            {t("activate")}
          </Button>
        </div>
      </div>

      {isActivating && (
        <div className="flex items-end gap-2 rounded-lg border border-dashed p-3">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">{t("planLabel")}</label>
            <Select value={selectedPlanId} onValueChange={handlePlanSelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("planPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {allPlans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-24 space-y-1">
            <label className="text-xs text-muted-foreground">{t("daysLabel")}</label>
            <Input type="number" min="1" value={days} onChange={(event) => setDays(event.target.value)} />
          </div>
          <Button type="button" size="sm" disabled={isSaving || !selectedPlanId} onClick={handleActivate}>
            {isSaving ? t("activating") : t("confirmActivate")}
          </Button>
        </div>
      )}
    </div>
  );
}
