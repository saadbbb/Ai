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

/**
 * Bootstrap (env var) admins only — never a database-managed admin. Used to
 * gate the highest-risk operations (workspace impersonation) to whoever
 * controls the deployment, not whoever a current admin has since added
 * through the self-service /admin/admins list.
 */
function isBootstrapAdmin(email: string): boolean {
  return bootstrapAdminEmails().includes(email.toLowerCase());
}

export const platformAdminService = {
  isPlatformAdmin,
  isBootstrapAdmin,
  listBootstrapEmails: bootstrapAdminEmails,
};
