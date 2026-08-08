export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** A tool the model may call, described in provider-agnostic JSON Schema. */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolExecutionResult {
  /** Text fed back to the model as the tool_result — success message or error explanation. */
  content: string;
  isError: boolean;
}

export interface GenerateReplyInput {
  systemPrompt: string;
  history: ChatMessage[];
  maxTokens?: number;
  /**
   * Optional — when present, the provider may call these tools mid-generation via
   * executeTool and loop until it produces a final text reply (bounded, see
   * MAX_TOOL_ITERATIONS in claude.provider.ts). The provider never knows what a
   * tool actually does; that's the Tool Dispatcher's job (see ../tools).
   */
  tools?: ToolDefinition[];
  executeTool?: (name: string, input: unknown) => Promise<ToolExecutionResult>;
}

export type ReplyStopReason = "end_turn" | "max_tokens" | "refusal" | "other";

export interface GenerateReplyResult {
  text: string;
  stopReason: ReplyStopReason;
  needsHumanHandover: boolean;
  /** Set alongside needsHumanHandover — see request_human_handover.tool.ts's HandoverCategory. */
  handoverCategory?: string;
  handoverReason?: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * The only shape application code is allowed to depend on for AI generation —
 * never a provider SDK directly (see AIService, the sole caller of this interface).
 */
export interface AIProvider {
  generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult>;
}

/**
 * Thrown by a provider (after its own SDK-level retries are exhausted — see
 * claude.provider.ts) for a failure worth retrying against a different model,
 * e.g. rate-limited or momentarily overloaded — never for an error that would
 * fail identically on any model (bad API key, malformed request). AiRouter is
 * the only thing that should ever catch this; every other caller sees a plain
 * AppError, same as before this existed.
 */
export class TransientProviderError extends Error {}
