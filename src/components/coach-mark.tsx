"use client";

import { Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "yaqiz:coachmark:";

function isDismissed(id: string) {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + id) === "1";
  } catch {
    return false;
  }
}

function dismiss(id: string) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + id, "1");
  } catch {
    // Storage may be unavailable (private mode, disabled) — the tip just reappears next visit.
  }
}

/**
 * A short, dismissible contextual tip shown the first time a user reaches an
 * important feature. Persists dismissal in localStorage so it never repeats
 * — see spec sections 24-27 (contextual, not a long tutorial; never re-shown).
 */
export function CoachMark({ id, title, description, className }: { id: string; title: string; description: string; className?: string }) {
  const t = useTranslations("common");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isDismissed(id)) setVisible(true);
  }, [id]);

  if (!visible) return null;

  function handleDismiss() {
    dismiss(id);
    setVisible(false);
  }

  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-primary/20 bg-primary-soft px-4 py-3.5",
        className,
      )}
    >
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Sparkles className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm text-text-secondary">{description}</p>
        <Button type="button" size="sm" variant="secondary" onClick={handleDismiss} className="mt-1">
          {t("gotIt")}
        </Button>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t("skip")}
        className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
