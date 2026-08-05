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
  appointmentStatusEnum,
  leadStageEnum,
  orderStatusEnum,
  workflowActionEnum,
  type WorkflowAction,
  workflowTriggerEnum,
  type WorkflowTrigger,
} from "@/db/schema";
import { createWorkflowAction } from "../actions/create-workflow.action";

const STATUS_TRIGGERS = new Set<WorkflowTrigger>(["order_status_changed", "appointment_status_changed"]);
const TAG_ACTIONS = new Set<WorkflowAction>(["add_contact_tag", "remove_contact_tag"]);

interface WorkflowTemplate {
  key: "tagNewLeads" | "notifyNewOrders" | "notifyHandover" | "tagCompletedAppointments";
  triggerType: WorkflowTrigger;
  triggerStatus?: string;
  actionType: WorkflowAction;
  actionTag?: string;
}

const TEMPLATES: WorkflowTemplate[] = [
  { key: "tagNewLeads", triggerType: "lead_created", actionType: "add_contact_tag", actionTag: "New Lead" },
  { key: "notifyNewOrders", triggerType: "order_created", actionType: "notify_owner_email" },
  { key: "notifyHandover", triggerType: "conversation_handed_over", actionType: "notify_owner_email" },
  {
    key: "tagCompletedAppointments",
    triggerType: "appointment_status_changed",
    triggerStatus: "completed",
    actionType: "add_contact_tag",
    actionTag: "Customer",
  },
];

export function NewWorkflowForm() {
  const router = useRouter();
  const t = useTranslations("automations.new");
  const tLeads = useTranslations("leads");
  const tOrders = useTranslations("orders");
  const tAppointments = useTranslations("appointments");
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<WorkflowTrigger>("lead_stage_changed");
  const [triggerStage, setTriggerStage] = useState("");
  const [triggerStatus, setTriggerStatus] = useState("");
  const [actionType, setActionType] = useState<WorkflowAction>("add_contact_tag");
  const [actionTag, setActionTag] = useState("");
  const [actionSubject, setActionSubject] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [delayDays, setDelayDays] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function applyTemplate(template: WorkflowTemplate) {
    setName(t(`templates.${template.key}`));
    setTriggerType(template.triggerType);
    setTriggerStage("");
    setTriggerStatus(template.triggerStatus ?? "");
    setActionType(template.actionType);
    setActionTag(template.actionTag ?? "");
    setActionSubject("");
    setActionMessage("");
    setDelayDays("");
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    const result = await createWorkflowAction({
      name,
      triggerType,
      triggerStage: triggerType === "lead_stage_changed" ? triggerStage || undefined : undefined,
      triggerStatus: STATUS_TRIGGERS.has(triggerType) ? triggerStatus || undefined : undefined,
      actionType,
      actionTag: TAG_ACTIONS.has(actionType) ? actionTag || undefined : undefined,
      actionSubject: actionType === "notify_owner_email" ? actionSubject || undefined : undefined,
      actionMessage: actionType === "notify_owner_email" ? actionMessage || undefined : undefined,
      delayDays: delayDays || undefined,
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
          <label className="text-sm font-medium">{t("templatesHeading")}</label>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((template) => (
              <Button key={template.key} type="button" variant="outline" size="sm" onClick={() => applyTemplate(template)}>
                {t(`templates.${template.key}`)}
              </Button>
            ))}
          </div>
        </div>

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

          {triggerType === "appointment_status_changed" && (
            <Select value={triggerStatus} onValueChange={setTriggerStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("statusPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {appointmentStatusEnum.enumValues.map((status) => (
                  <SelectItem key={status} value={status}>
                    {tAppointments(`statuses.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("delayLabel")}</label>
          <Input
            type="number"
            min="0"
            max="365"
            value={delayDays}
            onChange={(event) => setDelayDays(event.target.value)}
            placeholder={t("delayPlaceholder")}
          />
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

          {TAG_ACTIONS.has(actionType) && (
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
