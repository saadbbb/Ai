"use server";

import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE_NAME } from "@/i18n/config";

export async function setLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
