"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { FeatureFlag } from "@/db/schema";
import { createFeatureFlagAction } from "../actions/create-feature-flag.action";
import { setFeatureFlagEnabledAction } from "../actions/set-feature-flag-enabled.action";

export function FeatureFlagManager({ initialFlags }: { initialFlags: FeatureFlag[] }) {
  const t = useTranslations("platformAdmin.featureFlags");
  const [flags, setFlags] = useState(initialFlags);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

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
          {flags.map((flag) => (
            <div key={flag.id} className="flex items-center justify-between gap-4 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{flag.name}</p>
                <p className="truncate text-xs text-muted-foreground">{flag.key}</p>
                {flag.description && <p className="mt-1 text-muted-foreground">{flag.description}</p>}
              </div>
              <Switch
                checked={flag.enabled}
                onCheckedChange={(next) => handleToggle(flag, next)}
                disabled={savingId === flag.id}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
