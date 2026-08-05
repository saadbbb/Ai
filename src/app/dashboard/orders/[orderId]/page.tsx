import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatusSelect } from "@/features/orders/components/order-status-select";
import { orderTotal } from "@/features/orders/lib/order-total";
import { orderService } from "@/features/orders/services/order.service";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { AppError } from "@/lib/errors/app-error";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { orderId } = await params;
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const t = await getTranslations("orders");

  let data;
  try {
    data = await orderService.getOrder(workspace.id, orderId);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const { order, contact, items } = data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/dashboard/orders" className="text-sm text-muted-foreground hover:text-foreground">
        {t("backLink")}
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{contact.fullName}</h1>
          {contact.phone && <p className="text-sm text-muted-foreground">{contact.phone}</p>}
        </div>
        <div className="w-44">
          <OrderStatusSelect orderId={order.id} initialStatus={order.status} />
        </div>
      </div>

      <div className="divide-y rounded-lg border">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 text-sm">
            <span>
              {item.name} × {item.quantity}
            </span>
            <span className="text-muted-foreground">{(Number.parseFloat(item.unitPrice) * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between p-3 text-sm font-medium">
          <span>{t("totalHeading")}</span>
          <span>{orderTotal(items).toFixed(2)}</span>
        </div>
      </div>

      {order.notes && (
        <div className="space-y-1">
          <h2 className="text-sm font-medium">{t("notesHeading")}</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}
    </div>
  );
}
