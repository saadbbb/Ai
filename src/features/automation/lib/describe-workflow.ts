import type { Workflow } from "@/db/schema";

type Translator = (key: string, values?: Record<string, string | number>) => string;

export interface DescribeWorkflowTranslators {
  automations: Translator;
  leads: Translator;
  orders: Translator;
  appointments: Translator;
}

export function describeTrigger(workflow: Workflow, t: DescribeWorkflowTranslators): string {
  if (workflow.triggerType === "lead_stage_changed") {
    const stage = workflow.triggerConfig.stage;
    return t.automations("triggerLeadStage", { stage: stage ? t.leads(`stages.${stage}`) : "" });
  }
  if (workflow.triggerType === "order_status_changed") {
    const status = workflow.triggerConfig.status;
    return t.automations("triggerOrderStatus", { status: status ? t.orders(`statuses.${status}`) : "" });
  }
  if (workflow.triggerType === "appointment_status_changed") {
    const status = workflow.triggerConfig.status;
    return t.automations("triggerAppointmentStatus", {
      status: status ? t.appointments(`statuses.${status}`) : "",
    });
  }
  if (workflow.triggerType === "order_created") return t.automations("triggerOrderCreated");
  if (workflow.triggerType === "lead_created") return t.automations("triggerLeadCreated");
  if (workflow.triggerType === "appointment_created") return t.automations("triggerAppointmentCreated");
  if (workflow.triggerType === "tag_added") return t.automations("triggerTagAdded");
  return t.automations("triggerHandedOver");
}

export function describeAction(workflow: Workflow, t: Pick<DescribeWorkflowTranslators, "automations">): string {
  if (workflow.actionType === "add_contact_tag") {
    return t.automations("actionAddTag", { tag: workflow.actionConfig.tag ?? "" });
  }
  if (workflow.actionType === "remove_contact_tag") {
    return t.automations("actionRemoveTag", { tag: workflow.actionConfig.tag ?? "" });
  }
  if (workflow.actionType === "create_task") {
    return t.automations("actionCreateTask", { title: workflow.actionConfig.taskTitle ?? "" });
  }
  if (workflow.actionType === "create_note") {
    return t.automations("actionCreateNote");
  }
  if (workflow.actionType === "update_contact_language") {
    return t.automations("actionUpdateContactLanguage", { language: workflow.actionConfig.contactLanguage ?? "" });
  }
  return t.automations("actionNotifyOwner");
}

/** Null when the workflow runs immediately (no delayDays set). */
export function describeDelay(workflow: Workflow, t: Pick<DescribeWorkflowTranslators, "automations">): string | null {
  if (!workflow.delayDays || workflow.delayDays <= 0) return null;
  return t.automations("delaySummary", { days: workflow.delayDays });
}

/** Null when the workflow has no conditions (runs on every matching trigger). */
export function describeConditions(
  workflow: Workflow,
  t: Pick<DescribeWorkflowTranslators, "automations">,
): string | null {
  const conditions = workflow.conditions;
  if (!conditions || conditions.rules.length === 0) return null;

  const joiner = conditions.matchType === "any" ? t.automations("conditionOr") : t.automations("conditionAnd");
  const parts = conditions.rules.map((rule) =>
    rule.field === "tag"
      ? t.automations("conditionTag", { value: rule.value })
      : t.automations("conditionLanguage", { value: rule.value }),
  );
  return `${t.automations("conditionsPrefix")} ${parts.join(` ${joiner} `)}`;
}
