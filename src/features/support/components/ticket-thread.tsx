import type { SupportTicketMessage } from "@/db/schema";

/**
 * Pure display — used by both the tenant and Super Admin thread pages, which
 * differ only in who can post a reply. `internalNoteLabel` is optional since
 * the tenant-scoped repository never returns an internal message in the
 * first place (see supportTicketMessages.isInternal) — there's nothing to
 * label on that side.
 */
export function TicketThread({
  messages,
  tenantLabel,
  adminLabel,
  internalNoteLabel,
}: {
  messages: SupportTicketMessage[];
  tenantLabel: string;
  adminLabel: string;
  internalNoteLabel?: string;
}) {
  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`rounded-lg border p-3 text-sm ${
            message.isInternal ? "border-amber-500/40 bg-amber-500/10" : message.authorType === "admin" ? "bg-muted/50" : ""
          }`}
        >
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">
              {message.authorType === "admin" ? adminLabel : tenantLabel}
              {message.isInternal && internalNoteLabel && ` · ${internalNoteLabel}`}
            </span>
            <span>{new Date(message.createdAt).toLocaleString()}</span>
          </div>
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      ))}
    </div>
  );
}
