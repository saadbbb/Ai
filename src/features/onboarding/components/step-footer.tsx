import Link from "next/link";
import { Button } from "@/components/ui/button";

interface StepFooterProps {
  backHref?: string;
  isSubmitting: boolean;
  continueLabel?: string;
}

export function StepFooter({ backHref, isSubmitting, continueLabel = "Continue" }: StepFooterProps) {
  return (
    <div className="flex items-center justify-between pt-2">
      {backHref ? (
        <Button type="button" variant="ghost" asChild>
          <Link href={backHref}>Back</Link>
        </Button>
      ) : (
        <span />
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : continueLabel}
      </Button>
    </div>
  );
}
