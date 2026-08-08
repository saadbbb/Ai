import "server-only";
import type { ToolDefinition, ToolExecutionResult } from "../providers/types";
import { toolExecutionRepository } from "../repository/tool-execution.repository";
import { addTagTool } from "./add-tag.tool";
import { bookAppointmentTool } from "./book-appointment.tool";
import { createLeadTool } from "./create-lead.tool";
import { createOrderTool } from "./create-order.tool";
import { createTaskTool } from "./create-task.tool";
import { requestHumanHandoverTool } from "./request-human-handover.tool";
import type { AiTool, ToolContext, ToolSignals } from "./types";
import { updateContactInfoTool } from "./update-contact-info.tool";
import { AppError } from "@/lib/errors/app-error";

const TOOLS: AiTool[] = [
  createLeadTool,
  addTagTool,
  updateContactInfoTool,
  bookAppointmentTool,
  createOrderTool,
  createTaskTool,
  requestHumanHandoverTool,
];

export function getToolDefinitions(): ToolDefinition[] {
  return TOOLS.map((tool) => ({ name: tool.name, description: tool.description, inputSchema: tool.jsonSchema }));
}

/**
 * The Tool Dispatcher: AI → Action Planner (the model itself, via tool_use) →
 * here → application services → database. This is the single seam every tool
 * call passes through, so validation, workspace/contact authorization, and
 * audit logging (ai_tool_executions) apply uniformly instead of per-tool.
 */
export function createToolDispatcher(base: {
  workspaceId: string;
  contactId: string;
  conversationId: string;
}): { executeTool: (name: string, rawInput: unknown) => Promise<ToolExecutionResult>; signals: ToolSignals } {
  const signals: ToolSignals = { handoverRequested: false };
  const context: ToolContext = { ...base, signals };

  async function executeTool(name: string, rawInput: unknown): Promise<ToolExecutionResult> {
    const tool = TOOLS.find((candidate) => candidate.name === name);
    if (!tool) {
      return { content: `Unknown tool "${name}".`, isError: true };
    }

    const parsed = tool.schema.safeParse(rawInput ?? {});
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input.";
      await toolExecutionRepository.create({ ...base, toolName: name, input: rawInput ?? {}, success: false, resultSummary: message });
      return { content: message, isError: true };
    }

    try {
      const summary = await tool.execute(context, parsed.data);
      await toolExecutionRepository.create({
        ...base,
        toolName: name,
        input: parsed.data,
        success: true,
        resultSummary: summary,
      });
      return { content: summary, isError: false };
    } catch (error) {
      const message = error instanceof AppError ? error.message : "This action couldn't be completed.";
      if (!(error instanceof AppError)) {
        console.error(`[ai] tool "${name}" failed:`, error);
      }
      await toolExecutionRepository.create({
        ...base,
        toolName: name,
        input: parsed.data,
        success: false,
        resultSummary: message,
      });
      return { content: message, isError: true };
    }
  }

  return { executeTool, signals };
}
