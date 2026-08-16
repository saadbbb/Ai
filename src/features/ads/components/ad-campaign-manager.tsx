"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { SettingsCard } from "@/components/settings-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adCampaignStatusEnum, type AdCampaign, type AdCampaignStatus } from "@/db/schema";
import { createAdCampaignAction } from "../actions/create-ad-campaign.action";
import { updateAdCampaignSpendAction } from "../actions/update-ad-campaign-spend.action";
import { updateAdCampaignStatusAction } from "../actions/update-ad-campaign-status.action";

export function AdCampaignManager({ initialCampaigns }: { initialCampaigns: AdCampaign[] }) {
  const t = useTranslations("ads.campaigns");
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [name, setName] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [budget, setBudget] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [spendDrafts, setSpendDrafts] = useState<Record<string, string>>({});
  const [savingSpendId, setSavingSpendId] = useState<string | null>(null);

  async function handleSaveSpend(campaignId: string) {
    const draft = spendDrafts[campaignId];
    if (!draft || Number.isNaN(Number(draft))) return;

    setSavingSpendId(campaignId);
    const result = await updateAdCampaignSpendAction({ campaignId, actualSpend: Number(draft) });
    setSavingSpendId(null);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setCampaigns((current) => current.map((campaign) => (campaign.id === campaignId ? result.data : campaign)));
    setSpendDrafts((current) => {
      const next = { ...current };
      delete next[campaignId];
      return next;
    });
  }

  async function handleCreate() {
    if (!name.trim() || !utmCampaign.trim()) {
      toast.error(t("requiredHint"));
      return;
    }

    setIsCreating(true);
    const result = await createAdCampaignAction({ name, utmCampaign, budget: budget || undefined });
    setIsCreating(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setCampaigns((current) => [result.data, ...current]);
    setName("");
    setUtmCampaign("");
    setBudget("");
  }

  async function handleStatusChange(campaignId: string, status: AdCampaignStatus) {
    setSavingId(campaignId);
    const result = await updateAdCampaignStatusAction({ campaignId, status });
    setSavingId(null);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setCampaigns((current) => current.map((campaign) => (campaign.id === campaignId ? result.data : campaign)));
  }

  return (
    <SettingsCard title={t("heading")} description={t("description")}>
      <div className="space-y-4">
        <div className="space-y-2 rounded-lg border border-dashed border-input p-2">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("namePlaceholder")} />
          <Input value={utmCampaign} onChange={(event) => setUtmCampaign(event.target.value)} placeholder={t("utmPlaceholder")} />
          <Input type="number" step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder={t("budgetPlaceholder")} />
          <div className="flex justify-end">
            <Button type="button" disabled={isCreating} onClick={handleCreate}>
              {isCreating ? t("creating") : t("create")}
            </Button>
          </div>
        </div>

        {campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between gap-4 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{campaign.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{campaign.utmCampaign}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    className="w-28"
                    placeholder={t("spendPlaceholder")}
                    value={spendDrafts[campaign.id] ?? campaign.actualSpend ?? ""}
                    onChange={(event) => setSpendDrafts((current) => ({ ...current, [campaign.id]: event.target.value }))}
                    onBlur={() => handleSaveSpend(campaign.id)}
                    disabled={savingSpendId === campaign.id}
                  />
                  <Select
                    value={campaign.status}
                    onValueChange={(value) => handleStatusChange(campaign.id, value as AdCampaignStatus)}
                    disabled={savingId === campaign.id}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {adCampaignStatusEnum.enumValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {t(`statuses.${status}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SettingsCard>
  );
}
