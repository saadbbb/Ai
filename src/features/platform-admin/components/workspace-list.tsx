"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Plan, SubscriptionStatus } from "@/db/schema";
import type { AiUsageByWorkspace } from "../repository/ai-usage-admin.repository";
import type { WorkspaceAdminListItem } from "../repository/workspace-admin.repository";
import { WorkspaceRow } from "./workspace-row";

const STATUS_FILTERS: (SubscriptionStatus | "all")[] = [
  "all",
  "trial",
  "active",
  "past_due",
  "grace",
  "suspended",
  "cancelled",
  "expired",
];

/**
 * Client-side search/filter — deliberately not server-side pagination or a
 * `?q=` query param: the gap analysis explicitly called this out as "the
 * cheapest near-term win" against the current, still-small workspace list.
 * Revisit with server-side search once the list is large enough that
 * shipping every workspace's row to the client stops being cheap.
 */
export function WorkspaceList({
  items,
  allPlans,
  canImpersonate,
  canDelete,
  aiUsageByWorkspace,
}: {
  items: WorkspaceAdminListItem[];
  allPlans: Plan[];
  canImpersonate: boolean;
  canDelete: boolean;
  aiUsageByWorkspace: AiUsageByWorkspace[];
}) {
  const t = useTranslations("platformAdmin.workspaces");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | "all">("all");
  const [planFilter, setPlanFilter] = useState<string>("all");

  const aiUsageByWorkspaceId = useMemo(
    () => new Map(aiUsageByWorkspace.map((row) => [row.workspaceId, row])),
    [aiUsageByWorkspace],
  );

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return items.filter(({ workspace, ownerEmail, plan }) => {
      if (statusFilter !== "all" && workspace.subscriptionStatus !== statusFilter) return false;
      if (planFilter === "none" && plan !== null) return false;
      if (planFilter !== "all" && planFilter !== "none" && plan?.id !== planFilter) return false;
      if (!trimmed) return true;
      return [workspace.name, workspace.slug, ownerEmail ?? ""].some((field) => field.toLowerCase().includes(trimmed));
    });
  }, [items, query, statusFilter, planFilter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as SubscriptionStatus | "all")}>
          <SelectTrigger size="sm" className="w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((status) => (
              <SelectItem key={status} value={status}>
                {status === "all" ? t("allStatuses") : t(`statuses.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger size="sm" className="w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allPlans")}</SelectItem>
            <SelectItem value="none">{t("noPlanFilter")}</SelectItem>
            {allPlans.map((plan) => (
              <SelectItem key={plan.id} value={plan.id}>
                {plan.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {items.length === 0 ? t("emptyState") : t("noSearchResults")}
        </p>
      ) : (
        <div className="divide-y rounded-lg border">
          {filtered.map(({ workspace, ownerEmail, plan }) => (
            <WorkspaceRow
              key={workspace.id}
              workspace={workspace}
              ownerEmail={ownerEmail}
              initialPlan={plan}
              allPlans={allPlans}
              canImpersonate={canImpersonate}
              canDelete={canDelete}
              aiUsage={aiUsageByWorkspaceId.get(workspace.id) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
