/**
 * PART 4's Safety Layer, the post-generation half — prompt-builder.ts already
 * instructs the model never to reveal it's an AI or name the underlying
 * technology, but an instruction is not a guarantee. This is the
 * defense-in-depth check on the model's actual output, run after every
 * reply, before it ever reaches the customer.
 */
const DISCLOSURE_PATTERNS: RegExp[] = [
  /\bI(?:'m| am) an AI\b/i,
  /\bI(?:'m| am) a (?:large )?language model\b/i,
  /\bas an AI\b/i,
  /\bartificial intelligence\b/i,
  /\bAnthropic\b/i,
  /\bClaude\b/i,
  /\bOpenAI\b/i,
  /\bChatGPT\b/i,
  /\bmy system prompt\b/i,
  /\bmy instructions\b/i,
  /\bI (?:cannot|can't) reveal\b/i,
  /\bI was trained\b/i,
];

export function containsUnsafeDisclosure(text: string): boolean {
  return DISCLOSURE_PATTERNS.some((pattern) => pattern.test(text));
}

export const SAFE_FALLBACK_REPLY = "Let me get one of our team members to help you with that.";
