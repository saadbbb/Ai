import type { SupportTicketMessage } from "@/db/schema";

/** Pure display — used by both the tenant and Super Admin thread pages, which differ only in who can post a reply. */
export function TicketThread({
  messages,
  tenantLabel,
  adminLabel,
}: {
  messages: SupportTicketMessage[];
  tenantLabel: string;
  adminLabel: string;
}) {
  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`rounded-lg border p-3 text-sm ${message.authorType === "admin" ? "bg-muted/50" : ""}`}
        >
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">{message.authorType === "admin" ? adminLabel : tenantLabel}</span>
            <span>{new Date(message.createdAt).toLocaleString()}</span>
          </div>
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      ))}
    </div>
  );
}
