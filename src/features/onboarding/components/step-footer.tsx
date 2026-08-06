import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface StepFooterProps {
  backHref?: string;
  isSubmitting: boolean;
  continueLabel?: string;
  /** Set only on steps the spec marks skippable (business description, knowledge base) — renders a plain-text "Skip" link that moves on without saving. */
  skipHref?: string;
}

export function StepFooter({ backHref, isSubmitting, continueLabel, skipHref }: StepFooterProps) {
  const t = useTranslations("common");

  return (
    <div className="flex items-center justify-between pt-2">
      {backHref ? (
        <Button type="button" variant="ghost" asChild>
          <Link href={backHref}>{t("back")}</Link>
        </Button>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-3">
        {skipHref && (
          <Link href={skipHref} className="text-sm text-muted-foreground hover:text-foreground">
            {t("skip")}
          </Link>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("saving") : (continueLabel ?? t("continue"))}
        </Button>
      </div>
    </div>
  );
}
