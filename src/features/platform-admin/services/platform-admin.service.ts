import "server-only";
import { platformAdminRepository } from "../repository/platform-admin.repository";

function bootstrapAdminEmails(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Two layers, deliberately: the env var is the recovery mechanism that can
 * never be locked out by database state (only by redeploying with a
 * different value); the database list is self-service, so a current admin
 * can grant/revoke admin access to other emails without needing a redeploy.
 */
async function isPlatformAdmin(email: string): Promise<boolean> {
  const normalized = email.toLowerCase();
  if (bootstrapAdminEmails().includes(normalized)) return true;

  const dbAdmin = await platformAdminRepository.findByEmail(normalized);
  return dbAdmin !== null;
}

export const platformAdminService = {
  isPlatformAdmin,
  listBootstrapEmails: bootstrapAdminEmails,
};
