import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExportButtons } from "@/components/export-buttons";
import { Input } from "@/components/ui/input";
import { OrderStatusSelect } from "@/features/orders/components/order-status-select";
import { orderGrandTotal } from "@/features/orders/lib/order-total";
import { orderService } from "@/features/orders/services/order.service";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "orders");
  const t = await getTranslations("orders");
  const tCommon = await getTranslations("common");

  const orders = await orderService.listOrders(workspace.id, q);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ExportButtons
            reportPath="/api/reports/orders"
            labels={{ csv: tCommon("exportCsv"), excel: tCommon("exportExcel"), pdf: tCommon("exportPdf") }}
          />
          <Button asChild>
            <Link href="/dashboard/orders/new">{t("newOrder")}</Link>
          </Button>
        </div>
      </div>

      <form className="max-w-sm">
        <Input type="search" name="q" defaultValue={q ?? ""} placeholder={tCommon("searchPlaceholder")} aria-label={tCommon("search")} />
      </form>

      {orders.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t("emptyState")}
        </p>
      ) : (
        <div className="divide-y rounded-lg border">
          {orders.map(({ order, contact, items }) => (
            <div key={order.id} className="flex items-center justify-between gap-4 p-4">
              <Link href={`/dashboard/orders/${order.id}`} className="min-w-0 flex-1">
                <p className="truncate font-medium hover:underline">{contact.fullName}</p>
                <p className="text-sm text-muted-foreground">
                  {t("itemCount", { count: items.length })} · {orderGrandTotal(items, order).toFixed(2)}
                </p>
              </Link>
              <div className="w-40 shrink-0">
                <OrderStatusSelect orderId={order.id} initialStatus={order.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
