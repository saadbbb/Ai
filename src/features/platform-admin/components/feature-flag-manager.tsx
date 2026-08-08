"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { FeatureFlag } from "@/db/schema";
import { createFeatureFlagAction } from "../actions/create-feature-flag.action";
import { removeFeatureFlagOverrideAction } from "../actions/remove-feature-flag-override.action";
import { setFeatureFlagEnabledAction } from "../actions/set-feature-flag-enabled.action";
import { setFeatureFlagOverrideAction } from "../actions/set-feature-flag-override.action";
import type { FeatureFlagOverrideWithWorkspace } from "../repository/feature-flag.repository";

export function FeatureFlagManager({
  initialFlags,
  initialOverrides,
  workspaceOptions,
}: {
  initialFlags: FeatureFlag[];
  initialOverrides: Record<string, FeatureFlagOverrideWithWorkspace[]>;
  workspaceOptions: { id: string; name: string }[];
}) {
  const t = useTranslations("platformAdmin.featureFlags");
  const [flags, setFlags] = useState(initialFlags);
  const [overrides, setOverrides] = useState(initialOverrides);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedFlagId, setExpandedFlagId] = useState<string | null>(null);
  const [overrideWorkspaceId, setOverrideWorkspaceId] = useState<string>("");
  const [overrideEnabled, setOverrideEnabled] = useState(true);
  const [isSavingOverride, setIsSavingOverride] = useState(false);

  async function handleCreate() {
    if (!key.trim() || !name.trim()) {
      toast.error(t("requiredHint"));
      return;
    }

    setIsCreating(true);
    const result = await createFeatureFlagAction({ key: key.trim(), name: name.trim(), description: description.trim() || undefined, enabled: true });
    setIsCreating(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setFlags((current) => [...current, result.data].sort((a, b) => a.key.localeCompare(b.key)));
    setOverrides((current) => ({ ...current, [result.data.id]: [] }));
    setKey("");
    setName("");
    setDescription("");
  }

  async function handleToggle(flag: FeatureFlag, next: boolean) {
    setSavingId(flag.id);
    const result = await setFeatureFlagEnabledAction({ id: flag.id, enabled: next });
    setSavingId(null);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setFlags((current) => current.map((item) => (item.id === flag.id ? result.data : item)));
  }

  async function handleAddOverride(flagId: string) {
    if (!overrideWorkspaceId) return;

    setIsSavingOverride(true);
    const result = await setFeatureFlagOverrideAction({ featureFlagId: flagId, workspaceId: overrideWorkspaceId, enabled: overrideEnabled });
    setIsSavingOverride(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setOverrides((current) => ({
      ...current,
      [flagId]: [...(current[flagId] ?? []).filter((row) => row.workspaceId !== result.data.workspaceId), result.data],
    }));
    setOverrideWorkspaceId("");
  }

  async function handleRemoveOverride(flagId: string, overrideId: string) {
    const result = await removeFeatureFlagOverrideAction({ id: overrideId });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setOverrides((current) => ({ ...current, [flagId]: (current[flagId] ?? []).filter((row) => row.id !== overrideId) }));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">{t("newHeading")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={key} onChange={(event) => setKey(event.target.value)} placeholder={t("keyPlaceholder")} />
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("namePlaceholder")} />
          </div>
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            placeholder={t("descriptionPlaceholder")}
          />
          <div className="flex justify-end">
            <Button type="button" disabled={isCreating} onClick={handleCreate}>
              {isCreating ? t("creating") : t("create")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {flags.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{t("emptyState")}</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {flags.map((flag) => {
            const flagOverrides = overrides[flag.id] ?? [];
            const isExpanded = expandedFlagId === flag.id;
            return (
              <div key={flag.id} className="space-y-3 p-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{flag.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{flag.key}</p>
                    {flag.description && <p className="mt-1 text-muted-foreground">{flag.description}</p>}
                    {flagOverrides.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">{t("overrideCount", { count: flagOverrides.length })}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setExpandedFlagId(isExpanded ? null : flag.id)}>
                      {t("manageOverrides")}
                    </Button>
                    <Switch checked={flag.enabled} onCheckedChange={(next) => handleToggle(flag, next)} disabled={savingId === flag.id} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-2 rounded-lg border border-dashed p-3">
                    {flagOverrides.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t("noOverrides")}</p>
                    ) : (
                      <div className="divide-y rounded-md border">
                        {flagOverrides.map((override) => (
                          <div key={override.id} className="flex items-center justify-between gap-2 p-2 text-xs">
                            <span>
                              {override.workspaceName} · {override.enabled ? t("forcedOn") : t("forcedOff")}
                            </span>
                            <Button type="button" variant="ghost" size="xs" onClick={() => handleRemoveOverride(flag.id, override.id)}>
                              {t("removeOverride")}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Select value={overrideWorkspaceId} onValueChange={setOverrideWorkspaceId}>
                        <SelectTrigger size="sm" className="flex-1">
                          <SelectValue placeholder={t("selectWorkspace")} />
                        </SelectTrigger>
                        <SelectContent>
                          {workspaceOptions.map((workspace) => (
                            <SelectItem key={workspace.id} value={workspace.id}>
                              {workspace.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={overrideEnabled ? "on" : "off"} onValueChange={(value) => setOverrideEnabled(value === "on")}>
                        <SelectTrigger size="sm" className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on">{t("forcedOn")}</SelectItem>
                          <SelectItem value="off">{t("forcedOff")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button type="button" size="sm" disabled={isSavingOverride || !overrideWorkspaceId} onClick={() => handleAddOverride(flag.id)}>
                        {t("addOverride")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
