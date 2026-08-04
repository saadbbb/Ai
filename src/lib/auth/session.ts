import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { sessionRepository } from "@/features/auth/repository/session.repository";
import type { Session } from "@/db/schema";
import { getCachedSession, invalidateCachedSession, setCachedSession } from "@/lib/redis/session-cache";

const SESSION_COOKIE_NAME = "session";
const DEFAULT_SESSION_DAYS = 1;
const REMEMBER_ME_SESSION_DAYS = 30;

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function generateSecret(): string {
  return randomBytes(32).toString("hex");
}

export interface CreateSessionOptions {
  rememberMe?: boolean;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export async function createSession(userId: string, options: CreateSessionOptions = {}): Promise<Session> {
  const secret = generateSecret();
  const days = options.rememberMe ? REMEMBER_ME_SESSION_DAYS : DEFAULT_SESSION_DAYS;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const session = await sessionRepository.create({
    userId,
    refreshTokenHash: hashSecret(secret),
    userAgent: options.userAgent ?? null,
    ipAddress: options.ipAddress ?? null,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, `${session.id}.${secret}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return session;
}

export async function getCurrentSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  const [sessionId, secret] = raw.split(".");
  if (!sessionId || !secret) return null;

  const session = (await getCachedSession(sessionId)) ?? (await sessionRepository.findById(sessionId));
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await sessionRepository.deleteById(session.id);
    await invalidateCachedSession(session.id);
    return null;
  }

  const expectedHash = Buffer.from(session.refreshTokenHash, "hex");
  const actualHash = Buffer.from(hashSecret(secret), "hex");
  if (expectedHash.length !== actualHash.length || !timingSafeEqual(expectedHash, actualHash)) {
    return null;
  }

  await setCachedSession(session);
  await sessionRepository.touch(session.id);
  return session;
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (raw) {
    const [sessionId] = raw.split(".");
    if (sessionId) {
      await sessionRepository.deleteById(sessionId);
      await invalidateCachedSession(sessionId);
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}
