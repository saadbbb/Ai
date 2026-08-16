import { redirect } from "next/navigation";

/** Integrations moved into Workspace Settings as a tab (technical/rare-use, not a daily nav item). */
export default function IntegrationsRedirect() {
  redirect("/dashboard/workspace-profile?tab=integrations");
}
