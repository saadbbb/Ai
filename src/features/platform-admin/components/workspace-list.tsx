"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import type { Plan } from "@/db/schema";
import type { WorkspaceAdminListItem } from "../repository/workspace-admin.repository";
import { WorkspaceRow } from "./workspace-row";

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
}: {
  items: WorkspaceAdminListItem[];
  allPlans: Plan[];
  canImpersonate: boolean;
}) {
  const t = useTranslations("platformAdmin.workspaces");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return items;
    return items.filter(({ workspace, ownerEmail }) =>
      [workspace.name, workspace.slug, ownerEmail ?? ""].some((field) => field.toLowerCase().includes(trimmed)),
    );
  }, [items, query]);

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("searchPlaceholder")}
        className="max-w-sm"
      />

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
            />
          ))}
        </div>
      )}
    </div>
  );
}
