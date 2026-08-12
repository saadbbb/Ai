import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  appointmentStatusEnum,
  languageEnum,
  leadStageEnum,
  orderStatusEnum,
  taskPriorityEnum,
  workflowActionEnum,
  workflowTriggerEnum,
  type WorkflowAction,
  type WorkflowConditionField,
  type WorkflowConditionMatchType,
  type WorkflowTrigger,
} from "@/db/schema";
import type { ActionNodeData, ConditionsNodeData, TriggerNodeData } from "./types";

const STATUS_TRIGGERS = new Set<WorkflowTrigger>(["order_status_changed", "appointment_status_changed"]);
// "working_hours" was dropped from the product (the AI replies 24/7 now) — no longer
// selectable for new automations, but existing saved ones still evaluate fine (fails open).
const CONDITION_FIELDS: WorkflowConditionField[] = ["tag", "language", "lead_score", "order_value"];
const NUMERIC_FIELDS = new Set<WorkflowConditionField>(["lead_score", "order_value"]);
const MAX_CONDITIONS = 5;
const TAG_ACTIONS = new Set<WorkflowAction>(["add_contact_tag", "remove_contact_tag"]);

/**
 * Plain vertical "When → Only run if → Then" form over the exact same
 * trigger/conditions/action state the canvas nodes edit — same data, same
 * onChange contracts, just laid out as a form instead of a draggable graph.
 * See workflow-canvas.tsx for why this and the canvas can share one state.
 */
export function SimpleTriggerFields({ data }: { data: TriggerNodeData }) {
  const t = useTranslations("automations.new");
  const tLeads = useTranslations("leads");
  const tOrders = useTranslations("orders");
  const tAppointments = useTranslations("appointments");

  return (
    <Card>
      <CardContent className="space-y-3">
        <p className="text-sm font-medium">{t("triggerLabel")}</p>
        <Select
          value={data.triggerType}
          onValueChange={(value) => data.onChange({ triggerType: value as WorkflowTrigger, triggerStage: "", triggerStatus: "" })}
        >
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

        {data.triggerType === "lead_stage_changed" && (
          <Select value={data.triggerStage} onValueChange={(value) => data.onChange({ triggerStage: value as never })}>
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

        {data.triggerType === "order_status_changed" && (
          <Select value={data.triggerStatus} onValueChange={(value) => data.onChange({ triggerStatus: value as never })}>
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

        {STATUS_TRIGGERS.has(data.triggerType) && data.triggerType === "appointment_status_changed" && (
          <Select value={data.triggerStatus} onValueChange={(value) => data.onChange({ triggerStatus: value as never })}>
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
      </CardContent>
    </Card>
  );
}

export function SimpleConditionsFields({ data }: { data: ConditionsNodeData }) {
  const t = useTranslations("automations.new");

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{t("conditionsLabel")}</p>
          {data.conditions.length < MAX_CONDITIONS && (
            <button type="button" className="text-xs text-primary hover:underline" onClick={data.onAdd}>
              {t("addCondition")}
            </button>
          )}
        </div>

        {data.conditions.length === 0 && <p className="text-xs text-muted-foreground">{t("conditionsHint")}</p>}

        {data.conditions.length > 1 && (
          <Select value={data.matchType} onValueChange={(value) => data.onMatchTypeChange(value as WorkflowConditionMatchType)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("matchAll")}</SelectItem>
              <SelectItem value="any">{t("matchAny")}</SelectItem>
            </SelectContent>
          </Select>
        )}

        {data.conditions.map((row, index) => (
          <div key={index} className="flex items-center gap-2">
            <Select
              value={row.field}
              onValueChange={(value) =>
                data.onUpdate(index, {
                  field: value as WorkflowConditionField,
                  value: value === "working_hours" ? "true" : "",
                })
              }
            >
              <SelectTrigger className="w-36 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_FIELDS.map((field) => (
                  <SelectItem key={field} value={field}>
                    {t(`conditionFields.${field}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {row.field === "working_hours" ? (
              <p className="flex-1 text-xs text-muted-foreground">{t("conditionWorkingHoursHint")}</p>
            ) : (
              <Input
                className="flex-1"
                type={NUMERIC_FIELDS.has(row.field) ? "number" : "text"}
                value={row.value}
                onChange={(event) => data.onUpdate(index, { value: event.target.value })}
                placeholder={
                  row.field === "tag"
                    ? t("conditionTagPlaceholder")
                    : row.field === "language"
                      ? t("conditionLanguagePlaceholder")
                      : row.field === "lead_score"
                        ? t("conditionLeadScorePlaceholder")
                        : t("conditionOrderValuePlaceholder")
                }
              />
            )}
            <button type="button" className="shrink-0 text-xs text-muted-foreground hover:text-destructive" onClick={() => data.onRemove(index)}>
              {t("removeCondition")}
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SimpleActionFields({ data }: { data: ActionNodeData }) {
  const t = useTranslations("automations.new");

  return (
    <Card>
      <CardContent className="space-y-3">
        <p className="text-sm font-medium">{t("actionLabel")}</p>

        <Select value={data.actionType} onValueChange={(value) => data.onChange({ actionType: value as WorkflowAction })}>
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

        {TAG_ACTIONS.has(data.actionType) && (
          <Input value={data.actionTag} onChange={(event) => data.onChange({ actionTag: event.target.value })} placeholder={t("tagPlaceholder")} />
        )}

        {data.actionType === "notify_owner_email" && (
          <>
            <Input value={data.actionSubject} onChange={(event) => data.onChange({ actionSubject: event.target.value })} placeholder={t("subjectPlaceholder")} />
            <Textarea value={data.actionMessage} onChange={(event) => data.onChange({ actionMessage: event.target.value })} placeholder={t("messagePlaceholder")} rows={2} />
          </>
        )}

        {data.actionType === "create_task" && (
          <>
            <Input value={data.actionTaskTitle} onChange={(event) => data.onChange({ actionTaskTitle: event.target.value })} placeholder={t("taskTitlePlaceholder")} />
            <Select value={data.actionTaskPriority} onValueChange={(value) => data.onChange({ actionTaskPriority: value as ActionNodeData["actionTaskPriority"] })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("taskPriorityPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {taskPriorityEnum.enumValues.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {t(`taskPriorities.${priority}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="0"
              max="365"
              value={data.actionTaskDueInDays}
              onChange={(event) => data.onChange({ actionTaskDueInDays: event.target.value })}
              placeholder={t("taskDueInDaysPlaceholder")}
            />
          </>
        )}

        {data.actionType === "create_note" && (
          <Textarea value={data.actionNoteContent} onChange={(event) => data.onChange({ actionNoteContent: event.target.value })} placeholder={t("noteContentPlaceholder")} rows={2} />
        )}

        {data.actionType === "update_contact_language" && (
          <Select value={data.actionContactLanguage} onValueChange={(value) => data.onChange({ actionContactLanguage: value })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("contactLanguagePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {languageEnum.enumValues.map((language) => (
                <SelectItem key={language} value={language}>
                  {t(`contactLanguages.${language}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {data.actionType === "assign_agent" && (
          <Select value={data.actionAssignedUserId} onValueChange={(value) => data.onChange({ actionAssignedUserId: value })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("assignedUserPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {data.memberOptions.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {data.actionType === "webhook_call" && (
          <>
            <Input value={data.actionWebhookUrl} onChange={(event) => data.onChange({ actionWebhookUrl: event.target.value })} placeholder={t("webhookUrlPlaceholder")} />
            <Textarea value={data.actionMessage} onChange={(event) => data.onChange({ actionMessage: event.target.value })} placeholder={t("webhookMessagePlaceholder")} rows={2} />
          </>
        )}

        {data.actionType === "trigger_another_workflow" &&
          (data.workflowOptions.length > 0 ? (
            <Select value={data.actionTargetWorkflowId} onValueChange={(value) => data.onChange({ actionTargetWorkflowId: value })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("targetWorkflowPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {data.workflowOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-muted-foreground">{t("noOtherWorkflows")}</p>
          ))}

        {data.actionType === "create_order" &&
          (data.productOptions.length > 0 ? (
            <>
              <Select value={data.actionProductId} onValueChange={(value) => data.onChange({ actionProductId: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("productPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {data.productOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="1"
                max="999"
                value={data.actionQuantity}
                onChange={(event) => data.onChange({ actionQuantity: event.target.value })}
                placeholder={t("quantityPlaceholder")}
              />
            </>
          ) : (
            <p className="text-xs text-muted-foreground">{t("noProducts")}</p>
          ))}

        {data.actionType === "book_appointment" &&
          (data.serviceOptions.length > 0 ? (
            <>
              <Select value={data.actionServiceId} onValueChange={(value) => data.onChange({ actionServiceId: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("servicePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {data.serviceOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="0"
                max="365"
                value={data.actionDaysFromNow}
                onChange={(event) => data.onChange({ actionDaysFromNow: event.target.value })}
                placeholder={t("daysFromNowPlaceholder")}
              />
            </>
          ) : (
            <p className="text-xs text-muted-foreground">{t("noServices")}</p>
          ))}

        {data.actionType === "send_ai_reply" && <p className="text-xs text-muted-foreground">{t("sendAiReplyHint")}</p>}

        {data.actionType === "request_approval" && (
          <>
            <Textarea
              value={data.actionMessage}
              onChange={(event) => data.onChange({ actionMessage: event.target.value })}
              placeholder={t("approvalInstructionsPlaceholder")}
              rows={2}
            />
            {data.workflowOptions.length > 0 && (
              <Select value={data.actionTargetWorkflowId} onValueChange={(value) => data.onChange({ actionTargetWorkflowId: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("approvalWorkflowPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {data.workflowOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </>
        )}

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{t("delayLabel")}</label>
          <Input
            type="number"
            min="0"
            max="365"
            value={data.delayDays}
            onChange={(event) => data.onChange({ delayDays: event.target.value })}
            placeholder={t("delayPlaceholder")}
          />
        </div>
      </CardContent>
    </Card>
  );
}
