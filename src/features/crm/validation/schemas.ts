import { z } from "zod";
import { contactLifecycleStageEnum, leadStageEnum, taskPriorityEnum } from "@/db/schema";

export const createLeadFromConversationSchema = z.object({
  conversationId: z.string().uuid(),
});

export const updateLeadStageSchema = z.object({
  leadId: z.string().uuid(),
  stage: z.enum(leadStageEnum.enumValues),
});

export const createTaskSchema = z.object({
  contactId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  dueAt: z.coerce.date().optional(),
  priority: z.enum(taskPriorityEnum.enumValues).default("medium"),
});

export const completeTaskSchema = z.object({
  taskId: z.string().uuid(),
});

export const deleteTaskSchema = z.object({
  taskId: z.string().uuid(),
});

export const createNoteSchema = z.object({
  contactId: z.string().uuid(),
  content: z.string().trim().min(1).max(4000),
  pinned: z.boolean().default(false),
  type: z.enum(["team", "private"]).default("team"),
});

export const deleteNoteSchema = z.object({
  noteId: z.string().uuid(),
});

export const setLifecycleStageSchema = z.object({
  contactId: z.string().uuid(),
  stage: z.enum(contactLifecycleStageEnum.enumValues),
});

export const addTagSchema = z.object({
  contactId: z.string().uuid(),
  tag: z.string().trim().min(1).max(50),
});

export const removeTagSchema = z.object({
  contactId: z.string().uuid(),
  tag: z.string().trim().min(1).max(50),
});
