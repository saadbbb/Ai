"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  leadStageEnum,
  orderStatusEnum,
  workflowActionEnum,
  type WorkflowAction,
  workflowTriggerEnum,
  type WorkflowTrigger,
} from "@/db/schema";
import { createWorkflowAction } from "../actions/create-workflow.action";

export function NewWorkflowForm() {
  const router = useRouter();
  const t = useTranslations("automations.new");
  const tLeads = useTranslations("leads");
  const tOrders = useTranslations("orders");
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<WorkflowTrigger>("lead_stage_changed");
  const [triggerStage, setTriggerStage] = useState("");
  const [triggerStatus, setTriggerStatus] = useState("");
  const [actionType, setActionType] = useState<WorkflowAction>("add_contact_tag");
  const [actionTag, setActionTag] = useState("");
  const [actionSubject, setActionSubject] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    const result = await createWorkflowAction({
      name,
      triggerType,
      triggerStage: triggerType === "lead_stage_changed" ? triggerStage || undefined : undefined,
      triggerStatus: triggerType === "order_status_changed" ? triggerStatus || undefined : undefined,
      actionType,
      actionTag: actionType === "add_contact_tag" ? actionTag || undefined : undefined,
      actionSubject: actionType === "notify_owner_email" ? actionSubject || undefined : undefined,
      actionMessage: actionType === "notify_owner_email" ? actionMessage || undefined : undefined,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push("/dashboard/automations");
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("nameLabel")}</label>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("namePlaceholder")} />
        </div>

        <div className="space-y-2 rounded-lg border border-dashed border-input p-3">
          <label className="text-sm font-medium">{t("triggerLabel")}</label>
          <Select value={triggerType} onValueChange={(value) => setTriggerType(value as WorkflowTrigger)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {workflowTriggerEnum.enumValues.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`triggers.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {triggerType === "lead_stage_changed" && (
            <Select value={triggerStage} onValueChange={setTriggerStage}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("stagePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {leadStageEnum.enumValues.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {tLeads(`stages.${stage}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {triggerType === "order_status_changed" && (
            <Select value={triggerStatus} onValueChange={setTriggerStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("statusPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {orderStatusEnum.enumValues.map((status) => (
                  <SelectItem key={status} value={status}>
                    {tOrders(`statuses.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2 rounded-lg border border-dashed border-input p-3">
          <label className="text-sm font-medium">{t("actionLabel")}</label>
          <Select value={actionType} onValueChange={(value) => setActionType(value as WorkflowAction)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {workflowActionEnum.enumValues.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`actions.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {actionType === "add_contact_tag" && (
            <Input value={actionTag} onChange={(event) => setActionTag(event.target.value)} placeholder={t("tagPlaceholder")} />
          )}

          {actionType === "notify_owner_email" && (
            <>
              <Input
                value={actionSubject}
                onChange={(event) => setActionSubject(event.target.value)}
                placeholder={t("subjectPlaceholder")}
              />
              <Textarea
                value={actionMessage}
                onChange={(event) => setActionMessage(event.target.value)}
                placeholder={t("messagePlaceholder")}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">{t("messageHint")}</p>
            </>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="button" disabled={isSubmitting || !name} onClick={handleSubmit}>
            {isSubmitting ? t("submitting") : t("submit")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
