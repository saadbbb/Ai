import "server-only";
import { userRepository } from "@/features/auth/repository/user.repository";
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

/**
 * A bootstrap (env var) admin is never read-only — they control the
 * deployment and could just edit the database directly regardless. Only a
 * database-managed admin's `role` column can restrict them.
 */
async function isReadOnly(email: string): Promise<boolean> {
  if (isBootstrapAdmin(email)) return false;
  const dbAdmin = await platformAdminRepository.findByEmail(email);
  return dbAdmin?.role === "read_only";
}

/**
 * Every admin (bootstrap + database-managed) resolved to their `users` row,
 * for pickers like "assign this ticket to" that need a real userId, not just
 * an email. An admin who's never actually signed in yet (no users row exists
 * for their email) is silently skipped — they'll appear the first time they
 * log in, same as any other user (see requireUser's lazy-sync comment).
 */
async function listAssignableAdmins(): Promise<{ userId: string; email: string }[]> {
  const dbAdmins = await platformAdminRepository.findAll();
  const emails = [...new Set([...bootstrapAdminEmails(), ...dbAdmins.map((admin) => admin.email)])];

  const users = await Promise.all(emails.map((email) => userRepository.findByEmail(email)));
  return users
    .map((user, index) => (user ? { userId: user.id, email: emails[index] } : null))
    .filter((row): row is { userId: string; email: string } => row !== null);
}

export const platformAdminService = {
  isPlatformAdmin,
  isBootstrapAdmin,
  isReadOnly,
  listAssignableAdmins,
  listBootstrapEmails: bootstrapAdminEmails,
};
