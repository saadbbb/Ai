import type {
  AppointmentStatus,
  LeadStage,
  OrderStatus,
  TaskPriority,
  WorkflowAction,
  WorkflowConditionField,
  WorkflowConditionMatchType,
  WorkflowTrigger,
} from "@/db/schema";

export interface ConditionRow {
  field: WorkflowConditionField;
  value: string;
}

export interface TriggerNodeData {
  [key: string]: unknown;
  triggerType: WorkflowTrigger;
  triggerStage: LeadStage | "";
  triggerStatus: OrderStatus | AppointmentStatus | "";
  onChange: (patch: Partial<Pick<TriggerNodeData, "triggerType" | "triggerStage" | "triggerStatus">>) => void;
}

export interface ConditionsNodeData {
  [key: string]: unknown;
  conditions: ConditionRow[];
  matchType: WorkflowConditionMatchType;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, patch: Partial<ConditionRow>) => void;
  onMatchTypeChange: (matchType: WorkflowConditionMatchType) => void;
}

export interface WorkflowOption {
  id: string;
  name: string;
}

export interface MemberOption {
  id: string;
  label: string;
}

export interface CatalogOption {
  id: string;
  label: string;
}

export interface ActionNodeData {
  [key: string]: unknown;
  actionType: WorkflowAction;
  actionTag: string;
  actionSubject: string;
  actionMessage: string;
  actionTaskTitle: string;
  actionTaskPriority: TaskPriority;
  actionTaskDueInDays: string;
  actionNoteContent: string;
  actionContactLanguage: string;
  actionAssignedUserId: string;
  actionWebhookUrl: string;
  actionTargetWorkflowId: string;
  actionProductId: string;
  actionQuantity: string;
  actionServiceId: string;
  actionDaysFromNow: string;
  delayDays: string;
  memberOptions: MemberOption[];
  workflowOptions: WorkflowOption[];
  productOptions: CatalogOption[];
  serviceOptions: CatalogOption[];
  onChange: (
    patch: Partial<
      Pick<
        ActionNodeData,
        | "actionType"
        | "actionTag"
        | "actionSubject"
        | "actionMessage"
        | "actionTaskTitle"
        | "actionTaskPriority"
        | "actionTaskDueInDays"
        | "actionNoteContent"
        | "actionContactLanguage"
        | "actionAssignedUserId"
        | "actionWebhookUrl"
        | "actionTargetWorkflowId"
        | "actionProductId"
        | "actionQuantity"
        | "actionServiceId"
        | "actionDaysFromNow"
        | "delayDays"
      >
    >,
  ) => void;
}
