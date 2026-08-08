import type { MessageIntent } from "@/db/schema";

/**
 * Ordered rules — the first matching category wins, so more specific/urgent
 * signals (cancellation, complaint, urgent) are checked before broader ones
 * (question, greeting). English and Arabic keyword coverage only for now;
 * Kurdish isn't covered, same reasoning lead-score.ts's tag matching
 * documents for scope decisions like this — extend the pattern lists here
 * rather than adding a new mechanism when that's picked up.
 */
const RULES: { intent: MessageIntent; pattern: RegExp }[] = [
  {
    intent: "urgent",
    pattern: /\b(urgent|asap|emergency|right now|immediately)\b|عاجل|بسرعة|ضروري جدا/i,
  },
  {
    intent: "cancellation",
    pattern: /\b(cancel|cancelled|cancelling|refund)\b|الغاء|إلغاء|استرجاع|استرداد/i,
  },
  {
    intent: "complaint",
    pattern: /\b(complain|complaint|angry|disappointed|terrible|worst|awful|not happy|unacceptable)\b|شكوى|زعلان|سيء|أسوأ|مو راضي/i,
  },
  {
    intent: "price_inquiry",
    pattern: /\b(price|prices|cost|how much|pricing)\b|سعر|أسعار|كم سعر|كم يكلف/i,
  },
  {
    intent: "appointment_request",
    pattern: /\b(book|booking|appointment|schedule|reserve|reservation)\b|موعد|حجز|احجز/i,
  },
  {
    intent: "purchase_intent",
    pattern: /\b(buy|order|purchase|want to get|i(?:'d| would) like to (?:buy|order))\b|اشتري|أشتري|اطلب|أطلب|بغيت اشتري/i,
  },
  {
    intent: "spam",
    pattern: /\b(free money|click here|congratulations you (?:won|have won)|crypto investment)\b/i,
  },
  {
    intent: "greeting",
    pattern: /^\s*(hi|hello|hey|good morning|good evening|greetings)\b|^\s*(مرحبا|السلام عليكم|هلا|صباح الخير|مساء الخير)/i,
  },
  {
    intent: "question",
    pattern: /\?|؟|^\s*(what|when|where|why|how|is there|do you|can you)\b|^\s*(هل|متى|وين|شلون|كيف)/i,
  },
];

/** Cheap, deterministic classification for a single customer message — see the schema comment on messages.detectedIntent for why this isn't an AI call. */
export function detectIntent(content: string): MessageIntent {
  for (const rule of RULES) {
    if (rule.pattern.test(content)) return rule.intent;
  }
  return "other";
}
