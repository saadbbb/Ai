const MENTION_PATTERN = /@([a-z0-9._-]+)/gi;

/** Lowercased, deduped @tokens from note content — matched against a member's email local-part (before the @) by the caller. */
export function extractMentionTokens(content: string): string[] {
  const matches = content.matchAll(MENTION_PATTERN);
  const tokens = new Set<string>();
  for (const match of matches) {
    tokens.add(match[1].toLowerCase());
  }
  return [...tokens];
}
