import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { languageEnum, taskPriorityEnum, workflowActionEnum, type WorkflowAction } from "@/db/schema";
import type { ActionNodeData } from "./types";

const TAG_ACTIONS = new Set<WorkflowAction>(["add_contact_tag", "remove_contact_tag"]);

export function ActionNode({ data }: NodeProps<Node<ActionNodeData>>) {
  const t = useTranslations("automations.new");

  return (
    <div className="w-72 space-y-2 rounded-lg border bg-card p-3 shadow-sm">
      <Handle type="target" position={Position.Left} />
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("actionLabel")}</p>

      <Select value={data.actionType} onValueChange={(value) => data.onChange({ actionType: value as WorkflowAction })}>
        <SelectTrigger className="w-full nodrag">
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
        <Input
          className="nodrag"
          value={data.actionTag}
          onChange={(event) => data.onChange({ actionTag: event.target.value })}
          placeholder={t("tagPlaceholder")}
        />
      )}

      {data.actionType === "notify_owner_email" && (
        <>
          <Input
            className="nodrag"
            value={data.actionSubject}
            onChange={(event) => data.onChange({ actionSubject: event.target.value })}
            placeholder={t("subjectPlaceholder")}
          />
          <Textarea
            className="nodrag"
            value={data.actionMessage}
            onChange={(event) => data.onChange({ actionMessage: event.target.value })}
            placeholder={t("messagePlaceholder")}
            rows={2}
          />
        </>
      )}

      {data.actionType === "create_task" && (
        <>
          <Input
            className="nodrag"
            value={data.actionTaskTitle}
            onChange={(event) => data.onChange({ actionTaskTitle: event.target.value })}
            placeholder={t("taskTitlePlaceholder")}
          />
          <Select
            value={data.actionTaskPriority}
            onValueChange={(value) => data.onChange({ actionTaskPriority: value as ActionNodeData["actionTaskPriority"] })}
          >
            <SelectTrigger className="w-full nodrag">
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
            className="nodrag"
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
        <Textarea
          className="nodrag"
          value={data.actionNoteContent}
          onChange={(event) => data.onChange({ actionNoteContent: event.target.value })}
          placeholder={t("noteContentPlaceholder")}
          rows={2}
        />
      )}

      {data.actionType === "update_contact_language" && (
        <Select
          value={data.actionContactLanguage}
          onValueChange={(value) => data.onChange({ actionContactLanguage: value })}
        >
          <SelectTrigger className="w-full nodrag">
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

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">{t("delayLabel")}</label>
        <Input
          className="nodrag"
          type="number"
          min="0"
          max="365"
          value={data.delayDays}
          onChange={(event) => data.onChange({ delayDays: event.target.value })}
          placeholder={t("delayPlaceholder")}
        />
      </div>
    </div>
  );
}
