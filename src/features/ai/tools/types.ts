import "server-only";
import type { ZodType } from "zod";

/** Set by a tool (e.g. request_human_handover) to signal ai.service after the tool loop ends. */
export interface ToolSignals {
  handoverRequested: boolean;
  handoverReason?: string;
}

export interface ToolContext {
  workspaceId: string;
  contactId: string;
  conversationId: string;
  signals: ToolSignals;
}

/**
 * One tool the AI employee can invoke mid-reply. `schema` is the source of truth
 * for validation; `jsonSchema` is a hand-kept mirror used only to describe the
 * tool's shape to the model (see ../providers/types.ts ToolDefinition) — no
 * zod-to-json-schema dependency needed for this small, fixed set of tools.
 */
export interface AiTool<TInput = unknown> {
  name: string;
  description: string;
  schema: ZodType<TInput>;
  jsonSchema: Record<string, unknown>;
  execute(context: ToolContext, input: TInput): Promise<string>;
}
