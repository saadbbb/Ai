import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WorkflowConditionField, WorkflowConditionMatchType } from "@/db/schema";
import type { ConditionsNodeData } from "./types";

const CONDITION_FIELDS: WorkflowConditionField[] = ["tag", "language", "lead_score", "order_value", "working_hours"];
const NUMERIC_FIELDS = new Set<WorkflowConditionField>(["lead_score", "order_value"]);
const MAX_CONDITIONS = 5;

export function ConditionsNode({ data }: NodeProps<Node<ConditionsNodeData>>) {
  const t = useTranslations("automations.new");

  return (
    <div className="w-72 space-y-2 rounded-lg border bg-card p-3 shadow-sm">
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("conditionsLabel")}</p>
        {data.conditions.length < MAX_CONDITIONS && (
          <button type="button" className="nodrag text-xs text-primary hover:underline" onClick={data.onAdd}>
            {t("addCondition")}
          </button>
        )}
      </div>

      {data.conditions.length === 0 && <p className="text-xs text-muted-foreground">{t("conditionsHint")}</p>}

      {data.conditions.length > 1 && (
        <Select value={data.matchType} onValueChange={(value) => data.onMatchTypeChange(value as WorkflowConditionMatchType)}>
          <SelectTrigger className="w-full nodrag">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("matchAll")}</SelectItem>
            <SelectItem value="any">{t("matchAny")}</SelectItem>
          </SelectContent>
        </Select>
      )}

      {data.conditions.map((row, index) => (
        <div key={index} className="flex items-center gap-1">
          <Select
            value={row.field}
            onValueChange={(value) =>
              data.onUpdate(index, {
                field: value as WorkflowConditionField,
                value: value === "working_hours" ? "true" : "",
              })
            }
          >
            <SelectTrigger className="nodrag w-28 shrink-0">
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
              className="nodrag flex-1"
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
          <button type="button" className="nodrag shrink-0 text-xs text-muted-foreground hover:text-destructive" onClick={() => data.onRemove(index)}>
            {t("removeCondition")}
          </button>
        </div>
      ))}

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
