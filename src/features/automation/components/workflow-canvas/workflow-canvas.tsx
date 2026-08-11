"use client";

import "@xyflow/react/dist/style.css";
import { Background, Controls, MiniMap, ReactFlow, useNodesState, type Edge, type Node } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  AppointmentStatus,
  LeadStage,
  OrderStatus,
  TaskPriority,
  WorkflowAction,
  WorkflowConditionMatchType,
  WorkflowTrigger,
} from "@/db/schema";
import { createWorkflowAction } from "../../actions/create-workflow.action";
import { generateWorkflowAction } from "../../actions/generate-workflow.action";
import { ActionNode } from "./action-node";
import { ConditionsNode } from "./conditions-node";
import { SimpleActionFields, SimpleConditionsFields, SimpleTriggerFields } from "./simple-workflow-fields";
import { TriggerNode } from "./trigger-node";
import type {
  ActionNodeData,
  CatalogOption,
  ConditionRow,
  ConditionsNodeData,
  MemberOption,
  TriggerNodeData,
  WorkflowOption,
} from "./types";

const NODE_TYPES = { trigger: TriggerNode, conditions: ConditionsNode, action: ActionNode };

const NOOP = () => {};

// React Flow paints nodes once before the effect below can replace `data`
// with the real, interactive values — these have to be validly shaped
// (an empty conditions array, not undefined) or that first paint throws.
const INITIAL_NODES: Node[] = [
  {
    id: "trigger",
    type: "trigger",
    position: { x: 0, y: 80 },
    data: { triggerType: "lead_stage_changed", triggerStage: "", triggerStatus: "", onChange: NOOP } satisfies TriggerNodeData,
  },
  {
    id: "conditions",
    type: "conditions",
    position: { x: 340, y: 80 },
    data: {
      conditions: [],
      matchType: "all",
      onAdd: NOOP,
      onRemove: NOOP,
      onUpdate: NOOP,
      onMatchTypeChange: NOOP,
    } satisfies ConditionsNodeData,
  },
  {
    id: "action",
    type: "action",
    position: { x: 720, y: 80 },
    data: {
      actionType: "add_contact_tag",
      actionTag: "",
      actionSubject: "",
      actionMessage: "",
      actionTaskTitle: "",
      actionTaskPriority: "medium",
      actionTaskDueInDays: "",
      actionNoteContent: "",
      actionContactLanguage: "",
      actionAssignedUserId: "",
      actionWebhookUrl: "",
      actionTargetWorkflowId: "",
      actionProductId: "",
      actionQuantity: "",
      actionServiceId: "",
      actionDaysFromNow: "",
      delayDays: "",
      memberOptions: [],
      workflowOptions: [],
      productOptions: [],
      serviceOptions: [],
      onChange: NOOP,
    } satisfies ActionNodeData,
  },
];

const STATIC_EDGES: Edge[] = [
  { id: "trigger-conditions", source: "trigger", target: "conditions" },
  { id: "conditions-action", source: "conditions", target: "action" },
];

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

/**
 * Visual editor for the same trigger -> conditions -> action -> delay shape
 * the automation engine has always used (see automation.service.ts) — not a
 * general graph editor. Node count is fixed at three; positions are
 * draggable but not persisted (auto-laid-out fresh each visit), which kept
 * this to a canvas + three custom nodes instead of a full graph data model.
 * Undo/redo isn't implemented — a deliberate scope cut, noted in
 * DEFERRED_TASKS.md, not an oversight.
 *
 * Uses useNodesState (not a hand-rolled position record) deliberately: React
 * Flow only flips a node from its initial `visibility: hidden` to visible
 * once it has recorded that node's measured dimensions, and that
 * measurement is delivered back as a "dimensions" NodeChange through
 * onNodesChange. A version of this component that reconstructed a plain
 * {id, position} object on every change (discarding `measured`) fed React
 * Flow a "never measured" node on every render, so nodes — and the edges
 * between them, which need both endpoints measured — never became visible.
 * useNodesState's setNodes preserves the full node object (measured
 * included) when only `data` is patched below.
 */
interface WorkflowCanvasProps {
  memberOptions: MemberOption[];
  workflowOptions: WorkflowOption[];
  productOptions: CatalogOption[];
  serviceOptions: CatalogOption[];
}

export function WorkflowCanvas({ memberOptions, workflowOptions, productOptions, serviceOptions }: WorkflowCanvasProps) {
  const router = useRouter();
  const t = useTranslations("automations.new");

  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<WorkflowTrigger>("lead_stage_changed");
  const [triggerStage, setTriggerStage] = useState<LeadStage | "">("");
  const [triggerStatus, setTriggerStatus] = useState<OrderStatus | AppointmentStatus | "">("");
  const [conditions, setConditions] = useState<ConditionRow[]>([]);
  const [conditionsMatchType, setConditionsMatchType] = useState<WorkflowConditionMatchType>("all");
  const [actionType, setActionType] = useState<WorkflowAction>("add_contact_tag");
  const [actionTag, setActionTag] = useState("");
  const [actionSubject, setActionSubject] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionTaskTitle, setActionTaskTitle] = useState("");
  const [actionTaskPriority, setActionTaskPriority] = useState<TaskPriority>("medium");
  const [actionTaskDueInDays, setActionTaskDueInDays] = useState("");
  const [actionNoteContent, setActionNoteContent] = useState("");
  const [actionContactLanguage, setActionContactLanguage] = useState("");
  const [actionAssignedUserId, setActionAssignedUserId] = useState("");
  const [actionWebhookUrl, setActionWebhookUrl] = useState("");
  const [actionTargetWorkflowId, setActionTargetWorkflowId] = useState("");
  const [actionProductId, setActionProductId] = useState("");
  const [actionQuantity, setActionQuantity] = useState("");
  const [actionServiceId, setActionServiceId] = useState("");
  const [actionDaysFromNow, setActionDaysFromNow] = useState("");
  const [delayDays, setDelayDays] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [generatorDescription, setGeneratorDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<"simple" | "advanced">("simple");

  function applyTemplate(template: WorkflowTemplate) {
    setName(t(`templates.${template.key}`));
    setTriggerType(template.triggerType);
    setTriggerStage("");
    setTriggerStatus((template.triggerStatus as OrderStatus | AppointmentStatus) ?? "");
    setActionType(template.actionType);
    setActionTag(template.actionTag ?? "");
    setActionSubject("");
    setActionMessage("");
    setActionTaskTitle("");
    setActionTaskPriority("medium");
    setActionTaskDueInDays("");
    setActionNoteContent("");
    setActionContactLanguage("");
    setActionAssignedUserId("");
    setActionWebhookUrl("");
    setActionTargetWorkflowId("");
    setActionProductId("");
    setActionQuantity("");
    setActionServiceId("");
    setActionDaysFromNow("");
    setDelayDays("");
    setConditions([]);
    setConditionsMatchType("all");
  }

  /**
   * PART 6's AI Workflow Generator — populates the exact same form state
   * `applyTemplate` does, so the result is reviewable/editable on the canvas
   * before submitting through the same createWorkflowAction every manually-
   * built workflow uses. No separate execution model.
   */
  async function handleGenerate() {
    setIsGenerating(true);
    const result = await generateWorkflowAction({ description: generatorDescription });
    setIsGenerating(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    const fields = result.data;
    if (fields.name) setName(fields.name);
    if (fields.triggerType) setTriggerType(fields.triggerType as WorkflowTrigger);
    setTriggerStage((fields.triggerStage as LeadStage) ?? "");
    setTriggerStatus((fields.triggerStatus as OrderStatus | AppointmentStatus) ?? "");
    if (fields.actionType) setActionType(fields.actionType as WorkflowAction);
    setActionTag(fields.actionTag ?? "");
    setActionSubject(fields.actionSubject ?? "");
    setActionMessage(fields.actionMessage ?? "");
    setActionTaskTitle(fields.actionTaskTitle ?? "");
    setActionTaskPriority((fields.actionTaskPriority as TaskPriority) || "medium");
    setActionTaskDueInDays(fields.actionTaskDueInDays ? String(fields.actionTaskDueInDays) : "");
    setActionNoteContent(fields.actionNoteContent ?? "");
    setActionContactLanguage(fields.actionContactLanguage ?? "");
    setActionWebhookUrl(fields.actionWebhookUrl ?? "");
    setActionQuantity(fields.actionQuantity ? String(fields.actionQuantity) : "");
    setActionDaysFromNow(fields.actionDaysFromNow ? String(fields.actionDaysFromNow) : "");
    setDelayDays(fields.delayDays ? String(fields.delayDays) : "");
    toast.success(t("generatorSuccess"));
  }

  const triggerData: TriggerNodeData = {
    triggerType,
    triggerStage,
    triggerStatus,
    onChange: (patch) => {
      if (patch.triggerType !== undefined) setTriggerType(patch.triggerType);
      if (patch.triggerStage !== undefined) setTriggerStage(patch.triggerStage);
      if (patch.triggerStatus !== undefined) setTriggerStatus(patch.triggerStatus);
    },
  };

  const conditionsData: ConditionsNodeData = {
    conditions,
    matchType: conditionsMatchType,
    onAdd: () => setConditions((current) => [...current, { field: "tag", value: "" }]),
    onRemove: (index) => setConditions((current) => current.filter((_, i) => i !== index)),
    onUpdate: (index, patch) =>
      setConditions((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row))),
    onMatchTypeChange: setConditionsMatchType,
  };

  const actionData: ActionNodeData = {
    actionType,
    actionTag,
    actionSubject,
    actionMessage,
    actionTaskTitle,
    actionTaskPriority,
    actionTaskDueInDays,
    actionNoteContent,
    actionContactLanguage,
    actionAssignedUserId,
    actionWebhookUrl,
    actionTargetWorkflowId,
    actionProductId,
    actionQuantity,
    actionServiceId,
    actionDaysFromNow,
    delayDays,
    memberOptions,
    workflowOptions,
    productOptions,
    serviceOptions,
    onChange: (patch) => {
      if (patch.actionType !== undefined) setActionType(patch.actionType);
      if (patch.actionTag !== undefined) setActionTag(patch.actionTag);
      if (patch.actionSubject !== undefined) setActionSubject(patch.actionSubject);
      if (patch.actionMessage !== undefined) setActionMessage(patch.actionMessage);
      if (patch.actionTaskTitle !== undefined) setActionTaskTitle(patch.actionTaskTitle);
      if (patch.actionTaskPriority !== undefined) setActionTaskPriority(patch.actionTaskPriority);
      if (patch.actionTaskDueInDays !== undefined) setActionTaskDueInDays(patch.actionTaskDueInDays);
      if (patch.actionNoteContent !== undefined) setActionNoteContent(patch.actionNoteContent);
      if (patch.actionContactLanguage !== undefined) setActionContactLanguage(patch.actionContactLanguage);
      if (patch.actionAssignedUserId !== undefined) setActionAssignedUserId(patch.actionAssignedUserId);
      if (patch.actionWebhookUrl !== undefined) setActionWebhookUrl(patch.actionWebhookUrl);
      if (patch.actionTargetWorkflowId !== undefined) setActionTargetWorkflowId(patch.actionTargetWorkflowId);
      if (patch.actionProductId !== undefined) setActionProductId(patch.actionProductId);
      if (patch.actionQuantity !== undefined) setActionQuantity(patch.actionQuantity);
      if (patch.actionServiceId !== undefined) setActionServiceId(patch.actionServiceId);
      if (patch.actionDaysFromNow !== undefined) setActionDaysFromNow(patch.actionDaysFromNow);
      if (patch.delayDays !== undefined) setDelayDays(patch.delayDays);
    },
  };

  // The canvas is an alternate view over this same state — only mounted (and only fed
  // into React Flow's node graph) once the user opts into "advanced", so its layout
  // measurement quirks (see class doc above) never run for the simple-mode default path.
  useEffect(() => {
    if (viewMode !== "advanced") return;

    setNodes((current) =>
      current.map((node) => {
        if (node.id === "trigger") return { ...node, data: triggerData };
        if (node.id === "conditions") return { ...node, data: conditionsData };
        if (node.id === "action") return { ...node, data: actionData };
        return node;
      }),
    );
    // setNodes/setTriggerType/etc. are stable dispatch functions — omitting them keeps this
    // effect scoped to "form state changed", not "a setter's identity changed" (it never does).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewMode,
    triggerType,
    triggerStage,
    triggerStatus,
    conditions,
    conditionsMatchType,
    actionType,
    actionTag,
    actionSubject,
    actionMessage,
    actionTaskTitle,
    actionTaskPriority,
    actionTaskDueInDays,
    actionNoteContent,
    actionContactLanguage,
    actionAssignedUserId,
    actionWebhookUrl,
    actionTargetWorkflowId,
    actionProductId,
    actionQuantity,
    actionServiceId,
    actionDaysFromNow,
    delayDays,
    memberOptions,
    workflowOptions,
    productOptions,
    serviceOptions,
  ]);

  async function handleSubmit() {
    const filledConditions = conditions.filter((row) => row.value.trim().length > 0);

    setIsSubmitting(true);
    const result = await createWorkflowAction({
      name,
      triggerType,
      triggerStage: triggerType === "lead_stage_changed" ? triggerStage || undefined : undefined,
      triggerStatus:
        triggerType === "order_status_changed" || triggerType === "appointment_status_changed"
          ? triggerStatus || undefined
          : undefined,
      actionType,
      actionTag: actionType === "add_contact_tag" || actionType === "remove_contact_tag" ? actionTag || undefined : undefined,
      actionSubject: actionType === "notify_owner_email" ? actionSubject || undefined : undefined,
      actionTaskTitle: actionType === "create_task" ? actionTaskTitle || undefined : undefined,
      actionTaskPriority: actionType === "create_task" ? actionTaskPriority : undefined,
      actionTaskDueInDays: actionType === "create_task" ? actionTaskDueInDays || undefined : undefined,
      actionNoteContent: actionType === "create_note" ? actionNoteContent || undefined : undefined,
      actionContactLanguage: actionType === "update_contact_language" ? actionContactLanguage || undefined : undefined,
      actionAssignedUserId: actionType === "assign_agent" ? actionAssignedUserId || undefined : undefined,
      actionWebhookUrl: actionType === "webhook_call" ? actionWebhookUrl || undefined : undefined,
      actionMessage:
        actionType === "notify_owner_email" || actionType === "webhook_call" || actionType === "request_approval"
          ? actionMessage || undefined
          : undefined,
      actionTargetWorkflowId:
        actionType === "trigger_another_workflow" || actionType === "request_approval"
          ? actionTargetWorkflowId || undefined
          : undefined,
      actionProductId: actionType === "create_order" ? actionProductId || undefined : undefined,
      actionQuantity: actionType === "create_order" ? actionQuantity || undefined : undefined,
      actionServiceId: actionType === "book_appointment" ? actionServiceId || undefined : undefined,
      actionDaysFromNow: actionType === "book_appointment" ? actionDaysFromNow || undefined : undefined,
      conditions: filledConditions.length > 0 ? filledConditions : undefined,
      conditionsMatchType: filledConditions.length > 1 ? conditionsMatchType : undefined,
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
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-dashed p-3">
        <label className="text-sm font-medium">{t("generatorHeading")}</label>
        <p className="text-xs text-muted-foreground">{t("generatorHint")}</p>
        <Textarea
          value={generatorDescription}
          onChange={(event) => setGeneratorDescription(event.target.value)}
          placeholder={t("generatorPlaceholder")}
          rows={2}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isGenerating || generatorDescription.trim().length < 5}
            onClick={handleGenerate}
          >
            {isGenerating ? t("generating") : t("generateButton")}
          </Button>
        </div>
      </div>

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

      <div className="flex justify-end">
        <button type="button" className="text-xs text-primary hover:underline" onClick={() => setViewMode(viewMode === "simple" ? "advanced" : "simple")}>
          {viewMode === "simple" ? t("switchToAdvanced") : t("switchToSimple")}
        </button>
      </div>

      {viewMode === "simple" ? (
        <div className="space-y-4">
          <SimpleTriggerFields data={triggerData} />
          <SimpleConditionsFields data={conditionsData} />
          <SimpleActionFields data={actionData} />
        </div>
      ) : (
        <div className="h-[420px] rounded-lg border">
          <ReactFlow nodes={nodes} edges={STATIC_EDGES} nodeTypes={NODE_TYPES} onNodesChange={onNodesChange} fitView>
            <Background />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="button" disabled={isSubmitting || !name} onClick={handleSubmit}>
          {isSubmitting ? t("submitting") : t("submit")}
        </Button>
      </div>
    </div>
  );
}
