import { useTranslations } from "next-intl";
import type { ConversationAiStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

const STYLES: Record<ConversationAiStatus, string> = {
  active: "bg-primary/10 text-primary",
  paused: "bg-muted text-muted-foreground",
  handed_over: "bg-destructive/10 text-destructive",
};

const LABEL_KEY: Record<ConversationAiStatus, string> = {
  active: "aiActive",
  paused: "aiPaused",
  handed_over: "aiHandedOver",
};

export function AiStatusBadge({ status }: { status: ConversationAiStatus }) {
  const t = useTranslations("inbox.list");

  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", STYLES[status])}>
      {t(LABEL_KEY[status])}
    </span>
  );
}
