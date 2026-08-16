import { redirect } from "next/navigation";

/** Team management lives in the Workspace Settings hub — this URL is kept alive for old links/bookmarks. */
export default function TeamRedirect() {
  redirect("/dashboard/workspace-profile?tab=team");
}
