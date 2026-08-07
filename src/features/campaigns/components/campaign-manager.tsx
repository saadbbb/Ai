"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { contactLifecycleStageEnum, type Campaign, type ContactLifecycleStage } from "@/db/schema";
import { createCampaignAction } from "../actions/create-campaign.action";
import { previewRecipientsAction } from "../actions/preview-recipients.action";
import { sendCampaignAction } from "../actions/send-campaign.action";

export function CampaignManager({ initialCampaigns }: { initialCampaigns: Campaign[] }) {
  const t = useTranslations("campaigns");
  const tLifecycle = useTranslations("contacts.lifecycle");
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [segmentLifecycleStage, setSegmentLifecycleStage] = useState<ContactLifecycleStage | "">("");
  const [segmentTag, setSegmentTag] = useState("");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  async function handlePreview() {
    setIsPreviewing(true);
    const result = await previewRecipientsAction({
      segmentLifecycleStage: segmentLifecycleStage || undefined,
      segmentTag: segmentTag || undefined,
    });
    setIsPreviewing(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    setPreviewCount(result.data.length);
  }

  async function handleCreate() {
    if (!name.trim() || !subject.trim() || !message.trim()) {
      toast.error(t("requiredHint"));
      return;
    }

    setIsCreating(true);
    const result = await createCampaignAction({
      name,
      subject,
      message,
      segmentLifecycleStage: segmentLifecycleStage || undefined,
      segmentTag: segmentTag || undefined,
    });
    setIsCreating(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setCampaigns((current) => [result.data, ...current]);
    setName("");
    setSubject("");
    setMessage("");
    setSegmentLifecycleStage("");
    setSegmentTag("");
    setPreviewCount(null);
  }

  async function handleSend(campaignId: string) {
    if (!window.confirm(t("confirmSend"))) return;

    setSendingId(campaignId);
    const result = await sendCampaignAction({ campaignId });
    setSendingId(null);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setCampaigns((current) => current.map((campaign) => (campaign.id === campaignId ? result.data : campaign)));
    toast.success(t("sentToast", { count: result.data.recipientCount }));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">{t("newHeading")}</p>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("namePlaceholder")} />
          <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder={t("subjectPlaceholder")} />
          <Textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} placeholder={t("messagePlaceholder")} />

          <div className="grid gap-2 sm:grid-cols-2">
            <Select
              value={segmentLifecycleStage}
              onValueChange={(value) => {
                setSegmentLifecycleStage(value as ContactLifecycleStage);
                setPreviewCount(null);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("lifecycleStagePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {contactLifecycleStageEnum.enumValues.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {tLifecycle(stage)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={segmentTag}
              onChange={(event) => {
                setSegmentTag(event.target.value);
                setPreviewCount(null);
              }}
              placeholder={t("tagPlaceholder")}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" disabled={isPreviewing} onClick={handlePreview}>
              {isPreviewing ? t("previewing") : t("preview")}
            </Button>
            {previewCount !== null && <span className="text-sm text-muted-foreground">{t("recipientCount", { count: previewCount })}</span>}
          </div>

          <div className="flex justify-end border-t pt-4">
            <Button type="button" disabled={isCreating} onClick={handleCreate}>
              {isCreating ? t("creating") : t("create")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {campaigns.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{t("emptyState")}</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="flex items-center justify-between gap-4 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{campaign.name}</p>
                <p className="text-xs text-muted-foreground">
                  {campaign.status === "sent" ? t("sentSummary", { count: campaign.recipientCount }) : t("draftStatus")}
                </p>
              </div>
              {campaign.status === "draft" && (
                <Button type="button" size="sm" disabled={sendingId === campaign.id} onClick={() => handleSend(campaign.id)}>
                  {sendingId === campaign.id ? t("sending") : t("send")}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
