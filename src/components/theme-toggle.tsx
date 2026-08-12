"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { setThemeAction } from "@/lib/theme/actions";
import type { Theme } from "@/lib/theme/config";

/** Standalone, reusable — used from the topbar Profile menu today. Current theme comes from the server (see layout.tsx), never guessed client-side. */
export function ThemeToggle({ theme }: { theme: Theme }) {
  const t = useTranslations("common");
  const [isSaving, setIsSaving] = useState(false);
  const isDark = theme === "dark";

  async function handleClick() {
    setIsSaving(true);
    await setThemeAction(isDark ? "light" : "dark");
    // A soft router.refresh() re-runs Server Components but the App Router does
    // not re-apply attributes the root layout puts on <html> (class, style,
    // color-scheme) during a client-side transition — only a full navigation
    // does. A hard reload is what actually makes the new theme take effect.
    window.location.reload();
  }

  return (
    <Button type="button" variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleClick} disabled={isSaving}>
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {isDark ? t("lightModeToggle") : t("darkModeToggle")}
    </Button>
  );
}
