export type ChurnRiskLevel = "low" | "medium" | "high";

export interface ChurnRiskInput {
  /** null = this contact has never placed an order. */
  daysSinceLastOrder: number | null;
  /** null = no recorded contact at all. */
  daysSinceLastContact: number | null;
}

export interface ChurnRiskResult {
  score: number;
  level: ChurnRiskLevel;
}

const MAX_DAYS_CONSIDERED = 180;

/**
 * Deterministic and explainable, same "compute live, don't fake an ML model"
 * approach as lead-score.ts — this is a real heuristic, not a placeholder.
 * Staleness on *either* axis (no order, or no contact at all) drives risk up;
 * a customer who ordered recently but hasn't been talked to in months (or
 * vice versa) still reads as increasingly at-risk, not safe.
 */
export function calculateChurnRisk(input: ChurnRiskInput): ChurnRiskResult {
  const orderStaleness = input.daysSinceLastOrder === null ? MAX_DAYS_CONSIDERED : Math.min(input.daysSinceLastOrder, MAX_DAYS_CONSIDERED);
  const contactStaleness =
    input.daysSinceLastContact === null ? MAX_DAYS_CONSIDERED : Math.min(input.daysSinceLastContact, MAX_DAYS_CONSIDERED);

  const score = Math.round(((orderStaleness + contactStaleness) / 2 / MAX_DAYS_CONSIDERED) * 100);
  const level: ChurnRiskLevel = score >= 70 ? "high" : score >= 40 ? "medium" : "low";

  return { score, level };
}
