"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { applyThemeToDocument } from "@/lib/theme/apply-client";
import { setThemeAction } from "@/lib/theme/actions";
import type { Theme } from "@/lib/theme/config";

/** Standalone, reusable — used from the topbar Profile menu today. Initial theme comes from the server (see layout.tsx); after that this owns it locally so switching is instant. */
export function ThemeToggle({ theme }: { theme: Theme }) {
  const t = useTranslations("common");
  const [current, setCurrent] = useState(theme);
  const isDark = current === "dark";

  async function handleClick() {
    const next: Theme = isDark ? "light" : "dark";
    // Instant, synchronous DOM update — no reload, no waiting on the network.
    // Persisting to the cookie/account happens right after, off the paint path.
    applyThemeToDocument(next);
    setCurrent(next);
    try {
      await setThemeAction(next);
    } catch (error) {
      console.error("[theme] failed to persist theme:", error);
    }
  }

  return (
    <Button type="button" variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleClick}>
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {isDark ? t("lightModeToggle") : t("darkModeToggle")}
    </Button>
  );
}
