"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { InboxList } from "./inbox-list";
import type { ConversationListItem } from "../repository/conversation.repository";

interface InboxShellProps {
  initialConversations: ConversationListItem[];
  listHeader: ReactNode;
  children: ReactNode;
}

/**
 * Persistent list + detail shell: on desktop both panes stay mounted side by side
 * (Gmail-style), on mobile only one pane shows at a time based on the current route.
 */
export function InboxShell({ initialConversations, listHeader, children }: InboxShellProps) {
  const pathname = usePathname();
  const selectedId = pathname.startsWith("/dashboard/inbox/") ? pathname.split("/")[3] : undefined;
  const hasDetail = pathname !== "/dashboard/inbox";

  return (
    <div className="flex h-[calc(100dvh-6rem)] gap-4 md:h-[calc(100dvh-7rem)] lg:h-[calc(100dvh-8rem)]">
      <div
        className={cn(
          "flex w-full shrink-0 flex-col gap-3 overflow-y-auto md:w-96",
          hasDetail && "hidden md:flex",
        )}
      >
        {listHeader}
        <InboxList initialConversations={initialConversations} selectedId={selectedId} />
      </div>
      <div className={cn("min-w-0 flex-1 overflow-y-auto", !hasDetail && "hidden md:block")}>{children}</div>
    </div>
  );
}
