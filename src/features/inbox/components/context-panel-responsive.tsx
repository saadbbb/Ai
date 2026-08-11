"use client";

import { Info } from "lucide-react";
import { useLocale } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { isRtl } from "@/i18n/config";

interface ContextPanelSheetTriggerProps {
  triggerLabel: string;
  children: ReactNode;
}

/** Below `lg`, customer context opens as a slide-over (drawer on tablet, full-width sheet on mobile) instead of a persistent column. */
export function ContextPanelSheetTrigger({ triggerLabel, children }: ContextPanelSheetTriggerProps) {
  const locale = useLocale();
  const endSide = isRtl(locale) ? "left" : "right";

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label={triggerLabel} title={triggerLabel}>
          <Info className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side={endSide} className="w-full overflow-y-auto sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>{triggerLabel}</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
