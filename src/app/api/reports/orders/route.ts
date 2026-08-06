import { orderTotal } from "@/features/orders/lib/order-total";
import { orderRepository } from "@/features/orders/repository/order.repository";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { parseReportFormat, reportResponse } from "@/lib/report-response";

export async function GET(request: Request) {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "orders");

  const format = parseReportFormat(new URL(request.url).searchParams.get("format"));
  const orders = await orderRepository.findByWorkspaceId(workspace.id);

  return reportResponse(
    format,
    "orders",
    "Orders",
    ["Customer", "Phone", "Status", "Items", "Total", "Created At"],
    orders.map(({ order, contact, items }) => [
      contact.fullName,
      contact.phone ?? "",
      order.status,
      items.length,
      orderTotal(items).toFixed(2),
      order.createdAt.toISOString(),
    ]),
  );
}
