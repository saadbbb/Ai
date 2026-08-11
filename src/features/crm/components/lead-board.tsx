"use client";

import { Target } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { leadStageEnum, type LeadStage } from "@/db/schema";
import { leadTemperature } from "@/features/crm/lib/lead-score";
import { cn } from "@/lib/utils";
import { updateLeadStageAction } from "../actions/update-lead-stage.action";
import type { LeadListItemWithScore } from "../services/crm.service";

const STAGES = leadStageEnum.enumValues;

const STAGE_ACCENT: Partial<Record<LeadStage, string>> = {
  won: "border-t-success",
  lost: "border-t-destructive",
  cancelled: "border-t-destructive",
};

const TEMPERATURE_COLOR: Record<string, string> = {
  priority: "bg-error-soft text-error",
  hot: "bg-warning-soft text-warning-foreground",
  warm: "bg-accent-soft text-accent-foreground",
  cold: "bg-muted text-muted-foreground",
};

export function LeadBoard({ initialLeads }: { initialLeads: LeadListItemWithScore[] }) {
  const t = useTranslations("leads");
  const [leads, setLeads] = useState(initialLeads);

  async function handleStageChange(leadId: string, stage: LeadStage) {
    const previous = leads;
    setLeads((current) => current.map((item) => (item.lead.id === leadId ? { ...item, lead: { ...item.lead, stage } } : item)));

    const result = await updateLeadStageAction({ leadId, stage });
    if (!result.success) {
      toast.error(result.error.message);
      setLeads(previous);
    }
  }

  if (leads.length === 0) {
    return <EmptyState icon={Target} title={t("emptyBoard")} />;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STAGES.map((stage) => {
        const stageLeads = leads.filter((item) => item.lead.stage === stage).sort((a, b) => b.score - a.score);
        return (
          <div key={stage} className="w-64 shrink-0 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-medium">{t(`stages.${stage}`)}</h2>
              <span className="text-xs text-muted-foreground">{stageLeads.length}</span>
            </div>
            <div className="space-y-2">
              {stageLeads.map(({ lead, contact, score }) => (
                <Card key={lead.id} className={cn("border-t-2", STAGE_ACCENT[stage] ?? "border-t-border")}>
                  <div className="space-y-2 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{contact.fullName}</p>
                        {contact.phone && <p className="truncate text-xs text-muted-foreground">{contact.phone}</p>}
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                          TEMPERATURE_COLOR[leadTemperature(score)],
                        )}
                      >
                        {score}
                      </span>
                    </div>
                    <Select value={lead.stage} onValueChange={(value) => handleStageChange(lead.id, value as LeadStage)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map((option) => (
                          <SelectItem key={option} value={option}>
                            {t(`stages.${option}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {lead.conversationId && (
                      <Link
                        href={`/dashboard/inbox/${lead.conversationId}`}
                        className="block text-xs text-muted-foreground hover:text-foreground hover:underline"
                      >
                        {t("viewConversation")}
                      </Link>
                    )}
                  </div>
                </Card>
              ))}
              {stageLeads.length === 0 && <p className="px-1 text-xs text-muted-foreground">{t("emptyStage")}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
