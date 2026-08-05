import "server-only";
import type { User } from "@/db/schema";
import { createSession, destroyCurrentSession } from "@/lib/auth/session";
import { generateOtpCode, getOtpExpiry, hashOtpCode, OTP_MAX_ATTEMPTS, verifyOtpCode } from "@/lib/auth/otp";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { emailService } from "@/lib/email";
import { AppError } from "@/lib/errors/app-error";
import { checkRateLimit } from "@/lib/rate-limit/rate-limit";
import { otpRepository } from "../repository/otp.repository";
import { userRepository } from "../repository/user.repository";

type OtpPurpose = "registration" | "password_reset";

const VERIFICATION_WINDOW_MS = 15 * 60 * 1000;

export interface SessionContext {
  rememberMe?: boolean;
  userAgent?: string | null;
  ipAddress?: string | null;
}

async function issueOtp(email: string, purpose: OtpPurpose): Promise<void> {
  const allowed = await checkRateLimit(`otp:${email.toLowerCase()}:${purpose}`, { windowSeconds: 60, max: 1 });
  if (!allowed) {
    throw new AppError("RATE_LIMITED", "Please wait a moment before requesting another code.");
  }

  const code = generateOtpCode();
  await otpRepository.create({
    email,
    purpose,
    codeHash: hashOtpCode(code),
    expiresAt: getOtpExpiry(),
  });
  await emailService.sendOtpEmail({ to: email, code, purpose });
}

async function verifyOtp(email: string, code: string, purpose: OtpPurpose): Promise<void> {
  const otp = await otpRepository.findLatestActive(email, purpose);
  if (!otp) {
    throw new AppError("INVALID_OTP", "Invalid or expired code.");
  }

  if (otp.expiresAt.getTime() < Date.now()) {
    throw new AppError("OTP_EXPIRED", "This code has expired. Please request a new one.");
  }

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw new AppError("OTP_MAX_ATTEMPTS", "Too many attempts. Please request a new code.");
  }

  if (!verifyOtpCode(code, otp.codeHash)) {
    await otpRepository.incrementAttempts(otp.id);
    throw new AppError("INVALID_OTP", "Invalid or expired code.");
  }

  await otpRepository.markConsumed(otp.id);
}

async function startRegistration(email: string): Promise<void> {
  const existing = await userRepository.findByEmail(email);
  if (existing?.emailVerifiedAt) {
    throw new AppError("EMAIL_ALREADY_REGISTERED", "An account with this email already exists.");
  }

  await issueOtp(email, "registration");
}

async function verifyRegistrationOtp(email: string, code: string): Promise<void> {
  await verifyOtp(email, code, "registration");
}

async function completeRegistration(
  email: string,
  password: string,
  context: SessionContext = {},
): Promise<User> {
  const verified = await otpRepository.findRecentlyVerified(email, "registration", VERIFICATION_WINDOW_MS);
  if (!verified) {
    throw new AppError("INVALID_OTP", "Please verify your email again.");
  }

  const existing = await userRepository.findByEmail(email);
  if (existing?.emailVerifiedAt) {
    throw new AppError("EMAIL_ALREADY_REGISTERED", "An account with this email already exists.");
  }

  const passwordHash = await hashPassword(password);

  const user = existing
    ? await userRepository.setPasswordAndVerify(existing.id, passwordHash)
    : await userRepository.create({ email, passwordHash, emailVerifiedAt: new Date() });

  await createSession(user.id, context);
  return user;
}

async function login(email: string, password: string, context: SessionContext = {}): Promise<User> {
  const allowed = await checkRateLimit(`login:${email.toLowerCase()}`, { windowSeconds: 15 * 60, max: 5 });
  if (!allowed) {
    throw new AppError("RATE_LIMITED", "Too many login attempts. Please try again in a few minutes.");
  }

  const user = await userRepository.findByEmail(email);
  if (!user?.passwordHash || !user.emailVerifiedAt) {
    throw new AppError("INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new AppError("INVALID_CREDENTIALS", "Invalid email or password.");
  }

  await createSession(user.id, context);
  return user;
}

async function logout(): Promise<void> {
  await destroyCurrentSession();
}

async function requestPasswordReset(email: string): Promise<void> {
  const user = await userRepository.findByEmail(email);
  // Do not reveal whether the account exists.
  if (!user?.emailVerifiedAt) return;

  await issueOtp(email, "password_reset");
}

async function verifyPasswordResetOtp(email: string, code: string): Promise<void> {
  await verifyOtp(email, code, "password_reset");
}

async function resetPassword(email: string, password: string): Promise<void> {
  const verified = await otpRepository.findRecentlyVerified(email, "password_reset", VERIFICATION_WINDOW_MS);
  if (!verified) {
    throw new AppError("INVALID_OTP", "Please verify the code again.");
  }

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new AppError("NOT_FOUND", "Account not found.");
  }

  const passwordHash = await hashPassword(password);
  await userRepository.setPassword(user.id, passwordHash);
}

export const authService = {
  startRegistration,
  verifyRegistrationOtp,
  completeRegistration,
  login,
  logout,
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword,
};
