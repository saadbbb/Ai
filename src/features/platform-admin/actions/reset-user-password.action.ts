"use server";

import { randomBytes } from "crypto";
import { z } from "zod";
import { userRepository } from "@/features/auth/repository/user.repository";
import { requireWritePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, AppError, type ActionResult } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { auditLogRepository } from "../repository/audit-log.repository";

const schema = z.object({ userId: z.string().uuid() });

/** Readable-but-random — an admin relays this by phone/WhatsApp, so it needs to be short enough to say out loud. */
function generateTemporaryPassword(): string {
  return randomBytes(6).toString("base64url");
}

/**
 * The only recovery path for a phone account (see PART 3 spec — phone sign-up
 * has no verification code, so there's no self-service "forgot password" for
 * it either). The merchant contacts support, a platform admin resets it here,
 * and relays the one-time password shown back to them directly — nothing is
 * emailed or texted automatically since neither channel is wired up yet.
 */
export async function resetUserPasswordAction(input: unknown): Promise<ActionResult<{ temporaryPassword: string }>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requireWritePlatformAdmin();

  try {
    const user = await userRepository.findById(parsed.data.userId);
    if (!user) throw new AppError("NOT_FOUND", "User not found.");

    const temporaryPassword = generateTemporaryPassword();
    const supabaseAdmin = createSupabaseAdminClient();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: temporaryPassword });
    if (error) throw new AppError("INTERNAL_ERROR", error.message);

    await auditLogRepository.log({
      actorUserId: admin.id,
      actorEmail: admin.name ?? admin.email ?? "Unknown",
      action: "user_password_reset",
      targetType: "user",
      targetId: user.id,
      summary: `Reset the password for ${user.name ?? user.email ?? user.phone ?? user.id}.`,
    });

    return actionOk({ temporaryPassword });
  } catch (error) {
    return actionFail(error);
  }
}
