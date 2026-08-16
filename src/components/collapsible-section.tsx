"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/**
 * A titled, collapsible field group — for rarely-used or advanced fields that shouldn't
 * compete visually with the primary fields on a form. Closed by default so the common
 * path stays short; opens to reveal the rest.
 */
export function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-input">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 border-t border-input px-4 py-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}
