"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task, TaskPriority } from "@/db/schema";
import { completeTaskAction } from "../actions/complete-task.action";
import { createTaskAction } from "../actions/create-task.action";
import { deleteTaskAction } from "../actions/delete-task.action";

const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];

export function TaskPanel({ contactId, initialTasks }: { contactId: string; initialTasks: Task[] }) {
  const t = useTranslations("tasks");
  const [tasks, setTasks] = useState(initialTasks);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;
    setIsSubmitting(true);
    const result = await createTaskAction({
      contactId,
      title,
      dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      priority,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setTasks((current) => [result.data, ...current]);
    setTitle("");
    setDueAt("");
    setPriority("medium");
  }

  async function handleComplete(taskId: string) {
    const previous = tasks;
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status: "done" as const } : task)));

    const result = await completeTaskAction({ taskId });
    if (!result.success) {
      toast.error(result.error.message);
      setTasks(previous);
    }
  }

  async function handleDelete(taskId: string) {
    const previous = tasks;
    setTasks((current) => current.filter((task) => task.id !== taskId));

    const result = await deleteTaskAction({ taskId });
    if (!result.success) {
      toast.error(result.error.message);
      setTasks(previous);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium">{t("title")}</h2>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("titlePlaceholder")}
          className="min-w-[160px] flex-1"
        />
        <Input
          type="datetime-local"
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
          className="w-auto"
        />
        <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`priorities.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" size="sm" disabled={isSubmitting || !title.trim()} onClick={handleCreate}>
          {t("add")}
        </Button>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={task.status === "done"}
                  disabled={task.status === "done"}
                  onChange={() => handleComplete(task.id)}
                  className="size-4"
                />
                <div>
                  <p className={task.status === "done" ? "text-muted-foreground line-through" : ""}>{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(`priorities.${task.priority}`)}
                    {task.dueAt ? ` · ${new Date(task.dueAt).toLocaleString()}` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(task.id)}
                className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
              >
                {t("delete")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
