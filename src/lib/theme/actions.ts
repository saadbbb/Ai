"use server";

import { cookies } from "next/headers";
import { userRepository } from "@/features/auth/repository/user.repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isTheme, THEME_COOKIE_NAME, type Theme } from "./config";

/**
 * The single write path for theme changes — sets the cookie (works for every
 * visitor, logged in or not) and, when there's an account, persists to
 * users.theme too, so the choice follows that account across every device
 * (2026-08-12 fix: previously only a device-local preference, which is why
 * the same user could see different themes on their phone vs. desktop).
 */
export async function setThemeAction(theme: Theme): Promise<void> {
  if (!isTheme(theme)) return;

  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE_NAME, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();
  if (supabaseUser) {
    await userRepository.update(supabaseUser.id, { theme });
  }
}
