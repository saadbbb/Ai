import { redirect } from "next/navigation";

/** Billing lives in the Workspace Settings hub — this URL is kept alive for old links/bookmarks (invoice emails, blocked-subscription redirects). */
export default function BillingRedirect() {
  redirect("/dashboard/workspace-profile?tab=billing");
}
