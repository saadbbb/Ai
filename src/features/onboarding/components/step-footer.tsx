import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface StepFooterProps {
  backHref?: string;
  isSubmitting: boolean;
  continueLabel?: string;
}

export function StepFooter({ backHref, isSubmitting, continueLabel }: StepFooterProps) {
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
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("saving") : (continueLabel ?? t("continue"))}
      </Button>
    </div>
  );
}
