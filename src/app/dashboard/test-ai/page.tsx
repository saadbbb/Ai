import { redirect } from "next/navigation";

/** Test AI moved under AI Employee as a tab — this URL is kept alive for old links/bookmarks. */
export default function TestAiRedirect() {
  redirect("/dashboard/ai-employee/test");
}
