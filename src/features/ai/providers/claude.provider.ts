import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AppError } from "@/lib/errors/app-error";
import { TransientProviderError, type AIProvider, type GenerateReplyInput, type GenerateReplyResult, type ReplyStopReason } from "./types";

const DEFAULT_MAX_TOKENS = 1024;

/**
 * Caps the tool-call round trips within a single generateReply — an employee
 * that's still calling tools after this many turns is stuck, not thorough.
 * Prevents an infinite loop from ever reaching the customer or the API bill.
 */
const MAX_TOOL_ITERATIONS = 4;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

/**
 * Rate-limited, momentarily overloaded, or a connection/timeout — worth
 * AiRouter retrying against a different model. Everything else (bad API key,
 * malformed request, content policy) would fail identically regardless of
 * model, so it's surfaced as a normal AppError instead.
 */
export function isTransientAnthropicError(error: unknown): boolean {
  if (error instanceof Anthropic.APIConnectionError) return true;
  if (error instanceof Anthropic.APIError) {
    return error.status === undefined || error.status === 429 || error.status >= 500;
  }
  return false;
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
function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

export function createClaudeProvider(model: string): AIProvider {
  return {
    async generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult> {
      const tools: Anthropic.Tool[] | undefined = input.tools?.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
      }));

      const messages: Anthropic.MessageParam[] = input.history.map((message) => ({
        role: message.role,
        content: message.content,
      }));

      const usage = { inputTokens: 0, outputTokens: 0 };

      try {
        for (let iteration = 0; iteration <= MAX_TOOL_ITERATIONS; iteration++) {
          const response = await getClient().messages.create({
            model,
            max_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
            system: input.systemPrompt,
            messages,
            ...(tools && tools.length > 0 ? { tools } : {}),
          });

          usage.inputTokens += response.usage.input_tokens;
          usage.outputTokens += response.usage.output_tokens;

          const stopReason = mapStopReason(response.stop_reason);

          if (stopReason === "refusal") {
            return {
              text: "I'm not able to help with that — let me connect you with a member of our team.",
              stopReason,
              needsHumanHandover: true,
              usage,
            };
          }

          const toolUseBlocks = response.content.filter(
            (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
          );

          if (response.stop_reason !== "tool_use" || toolUseBlocks.length === 0 || !input.executeTool) {
            return { text: extractText(response.content), stopReason, needsHumanHandover: false, usage };
          }

          if (iteration === MAX_TOOL_ITERATIONS) break;

          messages.push({ role: "assistant", content: response.content });

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of toolUseBlocks) {
            const result = await input.executeTool(block.name, block.input);
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: result.content,
              is_error: result.isError,
            });
          }
          messages.push({ role: "user", content: toolResults });
        }

        // Tool loop exhausted without a final answer — fail safe to a human rather
        // than silence or a half-finished action.
        return {
          text: "Let me get a team member to finish helping you with this.",
          stopReason: "other",
          needsHumanHandover: true,
          usage,
        };
      } catch (error) {
        console.error("[ai] Claude provider error:", error);
        if (isTransientAnthropicError(error)) {
          throw new TransientProviderError("The AI provider is temporarily unavailable.");
        }
        throw new AppError("INTERNAL_ERROR", "The AI is temporarily unavailable. Please try again.");
      }
    },
  };
}
