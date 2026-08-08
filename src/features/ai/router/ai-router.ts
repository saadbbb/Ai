import "server-only";
import { createClaudeProvider } from "../providers/claude.provider";
import { TransientProviderError, type AIProvider, type ChatMessage } from "../providers/types";

export const DEFAULT_MODEL = "claude-haiku-4-5";

/**
 * The escalation tier — tried automatically when DEFAULT_MODEL fails
 * transiently (see selectProvider), and picked upfront by selectModel for a
 * conversation complex enough to plausibly need it. Single-provider (Claude)
 * "premium model" side of the reference spec's Router requirements; the
 * multi-provider side (OpenAI/Gemini/OpenRouter/Ollama) needs API credentials
 * this workspace doesn't have yet — see DEFERRED_TASKS.md.
 */
export const FALLBACK_MODEL = "claude-sonnet-4-5";

const COMPLEX_MESSAGE_COUNT_THRESHOLD = 20;
const COMPLEX_CONTENT_LENGTH_THRESHOLD = 6000;

/**
 * Proactive model selection: a long-running or heavy conversation gets the
 * stronger model upfront rather than waiting to fail on the cheap one first.
 * Everything else stays on DEFAULT_MODEL — most conversations are short and
 * don't need it.
 */
export function selectModel(history: ChatMessage[]): string {
  const totalLength = history.reduce((sum, message) => sum + message.content.length, 0);
  if (history.length > COMPLEX_MESSAGE_COUNT_THRESHOLD || totalLength > COMPLEX_CONTENT_LENGTH_THRESHOLD) {
    return FALLBACK_MODEL;
  }
  return DEFAULT_MODEL;
}

/**
 * Reactive fallback: DEFAULT_MODEL already retries transient failures inside
 * the Anthropic SDK itself (its own built-in backoff); a TransientProviderError
 * means that was exhausted too. One more attempt against FALLBACK_MODEL before
 * giving up — a different model/capacity pool clearing a momentary rate-limit
 * or overload is worth trying once, not indefinitely.
 */
export function selectProvider(model: string = DEFAULT_MODEL): AIProvider {
  const primary = createClaudeProvider(model);
  if (model === FALLBACK_MODEL) return primary;

  return {
    async generateReply(input) {
      try {
        return await primary.generateReply(input);
      } catch (error) {
        if (!(error instanceof TransientProviderError)) throw error;
        console.warn(`[ai-router] "${model}" failed transiently, falling back to "${FALLBACK_MODEL}":`, error);
        return createClaudeProvider(FALLBACK_MODEL).generateReply(input);
      }
    },
  };
}
