import "server-only";
import { createHash, randomInt, timingSafeEqual } from "crypto";

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;

export const OTP_MAX_ATTEMPTS = 5;

export function generateOtpCode(): string {
  return randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

export function hashOtpCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function verifyOtpCode(code: string, hash: string): boolean {
  const expected = Buffer.from(hash, "hex");
  const actual = Buffer.from(hashOtpCode(code), "hex");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export function getOtpExpiry(): Date {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
}
