import "server-only";
import type { NotificationType } from "@/db/schema";
import { userRepository } from "@/features/auth/repository/user.repository";
import { membershipRepository } from "@/features/workspace/repository/membership.repository";
import { emailService } from "@/lib/email";
import { notificationRepository } from "../repository/notification.repository";

interface NotifyWorkspaceOwnerInput {
  workspaceId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/**
 * In-app (notifications table) and email are independent channels — the
 * in-app one always gets created even if the email fails, same reasoning as
 * subscription-check.service.ts's own copy of this pattern (kept separate
 * there since it predates this helper; new callers should use this one).
 */
export async function notifyWorkspaceOwner(input: NotifyWorkspaceOwnerInput): Promise<void> {
  await notificationRepository.create({
    workspaceId: input.workspaceId,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link ?? null,
  });

  try {
    const ownerUserId = await membershipRepository.findOwnerUserId(input.workspaceId);
    const owner = ownerUserId ? await userRepository.findById(ownerUserId) : null;
    if (!owner?.email) return;
    await emailService.sendNotificationEmail({ to: owner.email, subject: input.title, text: input.message });
  } catch (error) {
    console.error(`[notify-owner] email failed for workspace ${input.workspaceId}:`, error);
  }
}
