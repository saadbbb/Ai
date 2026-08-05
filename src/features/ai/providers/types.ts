export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface GenerateReplyInput {
  systemPrompt: string;
  history: ChatMessage[];
  maxTokens?: number;
}

export type ReplyStopReason = "end_turn" | "max_tokens" | "refusal" | "other";

export interface GenerateReplyResult {
  text: string;
  stopReason: ReplyStopReason;
  needsHumanHandover: boolean;
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
