import "server-only";
import { createHash, randomBytes } from "node:crypto";

const KEY_PREFIX = "sk_live_";
const PREFIX_DISPLAY_LENGTH = 12;

export interface GeneratedApiKey {
  /** Shown to the user exactly once — never stored, never recoverable. */
  plaintext: string;
  /** Safe to store/display — the first few characters, e.g. "sk_live_a1b2c3d4". */
  displayPrefix: string;
  /** SHA-256 hex digest — high-entropy random tokens don't need a slow password hash like bcrypt. */
  hash: string;
}

export function generateApiKey(): GeneratedApiKey {
  const plaintext = `${KEY_PREFIX}${randomBytes(24).toString("hex")}`;
  return {
    plaintext,
    displayPrefix: plaintext.slice(0, PREFIX_DISPLAY_LENGTH),
    hash: hashApiKey(plaintext),
  };
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}
