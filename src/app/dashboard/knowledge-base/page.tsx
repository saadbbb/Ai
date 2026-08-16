import { redirect } from "next/navigation";

/** Knowledge Base moved under AI Employee as a tab — this URL is kept alive for old links/bookmarks. */
export default function KnowledgeBaseRedirect() {
  redirect("/dashboard/ai-employee/knowledge");
}
