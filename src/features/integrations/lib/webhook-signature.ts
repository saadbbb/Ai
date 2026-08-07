import "server-only";
import { createHmac, randomBytes } from "node:crypto";

export function generateWebhookSecret(): string {
  return randomBytes(24).toString("hex");
}

/** HMAC-SHA256 over the exact JSON string sent as the request body, so the receiver can verify with the same serialization. */
export function signWebhookPayload(secret: string, payload: unknown): string {
  return createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
}
