"use client";

import "@xyflow/react/dist/style.css";
import { Background, Controls, MiniMap, ReactFlow, useNodesState, type Edge, type Node } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  AppointmentStatus,
  LeadStage,
  OrderStatus,
  WorkflowAction,
  WorkflowConditionMatchType,
  WorkflowTrigger,
} from "@/db/schema";
import { createWorkflowAction } from "../../actions/create-workflow.action";
import { ActionNode } from "./action-node";
import { ConditionsNode } from "./conditions-node";
import { TriggerNode } from "./trigger-node";
import type { ActionNodeData, ConditionRow, ConditionsNodeData, TriggerNodeData } from "./types";

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
      delayDays: "",
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
export function WorkflowCanvas() {
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
  const [delayDays, setDelayDays] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);

  function applyTemplate(template: WorkflowTemplate) {
    setName(t(`templates.${template.key}`));
    setTriggerType(template.triggerType);
    setTriggerStage("");
    setTriggerStatus((template.triggerStatus as OrderStatus | AppointmentStatus) ?? "");
    setActionType(template.actionType);
    setActionTag(template.actionTag ?? "");
    setActionSubject("");
    setActionMessage("");
    setDelayDays("");
    setConditions([]);
    setConditionsMatchType("all");
  }

  useEffect(() => {
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
      delayDays,
      onChange: (patch) => {
        if (patch.actionType !== undefined) setActionType(patch.actionType);
        if (patch.actionTag !== undefined) setActionTag(patch.actionTag);
        if (patch.actionSubject !== undefined) setActionSubject(patch.actionSubject);
        if (patch.actionMessage !== undefined) setActionMessage(patch.actionMessage);
        if (patch.delayDays !== undefined) setDelayDays(patch.delayDays);
      },
    };

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
    triggerType,
    triggerStage,
    triggerStatus,
    conditions,
    conditionsMatchType,
    actionType,
    actionTag,
    actionSubject,
    actionMessage,
    delayDays,
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
      actionMessage: actionType === "notify_owner_email" ? actionMessage || undefined : undefined,
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

      <div className="h-[420px] rounded-lg border">
        <ReactFlow nodes={nodes} edges={STATIC_EDGES} nodeTypes={NODE_TYPES} onNodesChange={onNodesChange} fitView>
          <Background />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>

      <div className="flex justify-end">
        <Button type="button" disabled={isSubmitting || !name} onClick={handleSubmit}>
          {isSubmitting ? t("submitting") : t("submit")}
        </Button>
      </div>
    </div>
  );
}
