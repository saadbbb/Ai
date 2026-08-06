import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  appointmentStatusEnum,
  leadStageEnum,
  orderStatusEnum,
  workflowTriggerEnum,
  type WorkflowTrigger,
} from "@/db/schema";
import type { TriggerNodeData } from "./types";

const STATUS_TRIGGERS = new Set<WorkflowTrigger>(["order_status_changed", "appointment_status_changed"]);

export function TriggerNode({ data }: NodeProps<Node<TriggerNodeData>>) {
  const t = useTranslations("automations.new");
  const tLeads = useTranslations("leads");
  const tOrders = useTranslations("orders");
  const tAppointments = useTranslations("appointments");

  return (
    <div className="w-72 space-y-2 rounded-lg border bg-card p-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("triggerLabel")}</p>
      <Select value={data.triggerType} onValueChange={(value) => data.onChange({ triggerType: value as WorkflowTrigger, triggerStage: "", triggerStatus: "" })}>
        <SelectTrigger className="w-full nodrag">
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
          <SelectTrigger className="w-full nodrag">
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
          <SelectTrigger className="w-full nodrag">
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
          <SelectTrigger className="w-full nodrag">
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

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
