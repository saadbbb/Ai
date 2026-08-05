import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AppError } from "@/lib/errors/app-error";
import type { AIProvider, GenerateReplyInput, GenerateReplyResult, ReplyStopReason } from "./types";

const DEFAULT_MAX_TOKENS = 1024;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

function mapStopReason(stopReason: string | null): ReplyStopReason {
  switch (stopReason) {
    case "end_turn":
    case "stop_sequence":
      return "end_turn";
    case "max_tokens":
      return "max_tokens";
    case "refusal":
      return "refusal";
    default:
      return "other";
  }
}

/**
 * The only file in the app allowed to import @anthropic-ai/sdk. Everything else
 * goes through the AIProvider interface (see ../providers/types.ts).
 */
export function createClaudeProvider(model: string): AIProvider {
  return {
    async generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult> {
      try {
        const response = await getClient().messages.create({
          model,
          max_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
          system: input.systemPrompt,
          messages: input.history.map((message) => ({ role: message.role, content: message.content })),
        });

        const stopReason = mapStopReason(response.stop_reason);
        const usage = { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };

        if (stopReason === "refusal") {
          return {
            text: "I'm not able to help with that — let me connect you with a member of our team.",
            stopReason,
            needsHumanHandover: true,
            usage,
          };
        }

        const text = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("\n")
          .trim();

        return { text, stopReason, needsHumanHandover: false, usage };
      } catch (error) {
        console.error("[ai] Claude provider error:", error);
        throw new AppError("INTERNAL_ERROR", "The AI is temporarily unavailable. Please try again.");
      }
    },
  };
}
