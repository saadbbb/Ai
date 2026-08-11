import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { NotePanel } from "@/features/crm/components/note-panel";
import type { Lead, Note } from "@/db/schema";
import type { AppointmentListItem } from "@/features/appointments/repository/appointment.repository";
import type { OrderListItem } from "@/features/orders/repository/order.repository";
import { orderGrandTotal } from "@/features/orders/lib/order-total";

interface ConversationContextPanelProps {
  contactId: string;
  lead: Lead | null;
  orders: OrderListItem[];
  appointments: AppointmentListItem[];
  notes: Note[];
  activitySummaries: string[];
}

export async function ConversationContextPanel({
  contactId,
  lead,
  orders,
  appointments,
  notes,
  activitySummaries,
}: ConversationContextPanelProps) {
  const t = await getTranslations("inbox.thread.context");
  const tLeads = await getTranslations("leads");
  const upcomingAppointments = appointments.filter((item) => item.appointment.scheduledAt.getTime() > Date.now());

  return (
    <div className="w-full space-y-4 overflow-y-auto rounded-lg border p-4 text-sm lg:h-full lg:w-72 lg:shrink-0">
      <Link href={`/dashboard/contacts/${contactId}`} className="text-xs text-primary hover:underline">
        {t("viewFullProfile")}
      </Link>

      <div>
        <p className="text-xs font-medium text-muted-foreground">{t("leadStage")}</p>
        {lead ? (
          <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs">
            {tLeads(`stages.${lead.stage}`)}
          </span>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">{t("noLead")}</p>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground">{t("ordersHeading")}</p>
        {orders.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">{t("noOrders")}</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {orders.slice(0, 3).map(({ order, items }) => (
              <li key={order.id}>
                <Link href={`/dashboard/orders/${order.id}`} className="text-xs hover:underline">
                  {order.status} · {orderGrandTotal(items, order).toFixed(2)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground">{t("appointmentsHeading")}</p>
        {upcomingAppointments.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">{t("noAppointments")}</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {upcomingAppointments.slice(0, 3).map(({ appointment }) => (
              <li key={appointment.id} className="text-xs">
                {appointment.serviceName ?? ""} — {appointment.scheduledAt.toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground">{t("activityHeading")}</p>
        {activitySummaries.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">{t("noActivity")}</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {activitySummaries.slice(0, 5).map((summary, index) => (
              <li key={index} className="truncate text-xs text-muted-foreground">
                {summary}
              </li>
            ))}
          </ul>
        )}
      </div>

      <NotePanel contactId={contactId} initialNotes={notes} />
    </div>
  );
}
