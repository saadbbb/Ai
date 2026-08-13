export interface SetupScoreInput {
  hasBusinessDescription: boolean;
  hasLogo: boolean;
  hasCatalog: boolean;
  hasContactInfo: boolean;
  hasTracking: boolean;
}

export interface SetupScoreItem {
  key: keyof SetupScoreInput;
  done: boolean;
  /** Tracking is a nice-to-have (⚠, non-blocking) — everything else blocks "ready to publish". */
  blocking: boolean;
}

export interface SetupScore {
  ready: boolean;
  items: SetupScoreItem[];
}

/**
 * Deliberately short (5 items, spec: "لا تجعلها Checklist طويلة") and only checks things
 * that actually matter for a usable storefront — not a generic "fill in every field" audit.
 */
export function computeSetupScore(input: SetupScoreInput): SetupScore {
  const items: SetupScoreItem[] = [
    { key: "hasBusinessDescription", done: input.hasBusinessDescription, blocking: true },
    { key: "hasLogo", done: input.hasLogo, blocking: true },
    { key: "hasCatalog", done: input.hasCatalog, blocking: true },
    { key: "hasContactInfo", done: input.hasContactInfo, blocking: true },
    { key: "hasTracking", done: input.hasTracking, blocking: false },
  ];

  return { ready: items.filter((item) => item.blocking).every((item) => item.done), items };
}
