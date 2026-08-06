import { createBrowserClient } from "@supabase/ssr";

/** Browser-side Supabase client — used by client components for signInWithPassword/signUp/OAuth/updateUser. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
