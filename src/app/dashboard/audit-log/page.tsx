import { redirect } from "next/navigation";

/** Audit log lives in the Workspace Settings hub — this URL is kept alive for old links/bookmarks. */
export default function AuditLogRedirect() {
  redirect("/dashboard/workspace-profile?tab=auditLog");
}
