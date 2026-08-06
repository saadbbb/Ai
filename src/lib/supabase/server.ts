import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client for Server Components/Actions/Route Handlers —
 * reads the session from cookies. Writing cookies from a Server Component
 * (not a Route Handler or Server Action) throws; middleware.ts is what
 * actually refreshes the session cookie on every request, so that failure
 * is safe to swallow here.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render — middleware.ts handles the actual refresh.
        }
      },
    },
  });
}
