import type { LeadStage } from "@/db/schema";

export interface LeadScoreInput {
  messageCount: number;
  hasOrder: boolean;
  hasAppointment: boolean;
  tags: string[];
  stage: LeadStage;
  lastContactAt: Date | null;
}

/**
 * Deterministic stand-in for the spec's "AI calculates score" (Part 5) — built
 * from signals the app actually has structured data for (messages, orders,
 * appointments, tags, stage, recency) rather than NLP-derived ones like
 * "budget mentioned" or "urgency", which would need a model call per lead.
 */
const STAGE_POINTS: Record<LeadStage, number> = {
  new: 0,
  qualified: 5,
  contacted: 10,
  waiting: 12,
  negotiation: 20,
  appointment: 20,
  proposal_sent: 25,
  won: 30,
  lost: -30,
  cancelled: -30,
};

const MESSAGE_POINTS_PER_MESSAGE = 2;
const MESSAGE_POINTS_CAP = 20;
const ORDER_POINTS = 25;
const APPOINTMENT_POINTS = 20;
const VIP_TAG_POINTS = 15;
const STALE_14_DAYS_PENALTY = 10;
const STALE_30_DAYS_PENALTY = 20;

export function calculateLeadScore(input: LeadScoreInput): number {
  let score = 0;
  score += Math.min(input.messageCount * MESSAGE_POINTS_PER_MESSAGE, MESSAGE_POINTS_CAP);
  if (input.hasOrder) score += ORDER_POINTS;
  if (input.hasAppointment) score += APPOINTMENT_POINTS;
  if (input.tags.some((tag) => tag.toLowerCase() === "vip")) score += VIP_TAG_POINTS;
  score += STAGE_POINTS[input.stage];

  if (input.lastContactAt) {
    const daysSinceContact = (Date.now() - input.lastContactAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceContact > 30) score -= STALE_30_DAYS_PENALTY;
    else if (daysSinceContact > 14) score -= STALE_14_DAYS_PENALTY;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export type LeadTemperature = "cold" | "warm" | "hot" | "priority";

export function leadTemperature(score: number): LeadTemperature {
  if (score >= 90) return "priority";
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}
