import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { OrderStatusSelect } from "@/features/orders/components/order-status-select";
import { ShippingForm } from "@/features/orders/components/shipping-form";
import { orderGrandTotal, orderSubtotal } from "@/features/orders/lib/order-total";
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

      <PageHeader
        title={contact.fullName}
        description={contact.phone ?? undefined}
        actions={
          <div className="w-44">
            <OrderStatusSelect orderId={order.id} initialStatus={order.status} />
          </div>
        }
      />

      <div className="divide-y overflow-hidden rounded-xl border bg-card">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 text-sm">
            <span>
              {item.name} × {item.quantity}
            </span>
            <span className="text-muted-foreground">{(Number.parseFloat(item.unitPrice) * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="space-y-1 p-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>{t("subtotalHeading")}</span>
            <span>{orderSubtotal(items).toFixed(2)}</span>
          </div>
          {Number.parseFloat(order.discountAmount) > 0 && (
            <div className="flex items-center justify-between">
              <span>{t("discountHeading")}</span>
              <span>-{Number.parseFloat(order.discountAmount).toFixed(2)}</span>
            </div>
          )}
          {Number.parseFloat(order.taxAmount) > 0 && (
            <div className="flex items-center justify-between">
              <span>{t("taxHeading")}</span>
              <span>{Number.parseFloat(order.taxAmount).toFixed(2)}</span>
            </div>
          )}
          {Number.parseFloat(order.deliveryFee) > 0 && (
            <div className="flex items-center justify-between">
              <span>{t("deliveryFeeHeading")}</span>
              <span>{Number.parseFloat(order.deliveryFee).toFixed(2)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between p-3 text-sm font-medium">
          <span>{t("totalHeading")}</span>
          <span>{orderGrandTotal(items, order).toFixed(2)}</span>
        </div>
      </div>

      {(order.paymentMethod || order.deliveryMethod) && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          {order.paymentMethod && <span>{t(`new.paymentMethods.${order.paymentMethod}`)}</span>}
          {order.deliveryMethod && <span>{t(`new.deliveryMethods.${order.deliveryMethod}`)}</span>}
        </div>
      )}

      {order.notes && (
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">{t("notesHeading")}</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}

      {order.deliveryMethod === "delivery" && <ShippingForm order={order} />}
    </div>
  );
}
