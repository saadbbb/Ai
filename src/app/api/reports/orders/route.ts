import { orderTotal } from "@/features/orders/lib/order-total";
import { orderRepository } from "@/features/orders/repository/order.repository";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { csvResponse, toCsv } from "@/lib/csv";

export async function GET() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "orders");

  const orders = await orderRepository.findByWorkspaceId(workspace.id);
  const csv = toCsv(
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

  return csvResponse("orders", csv);
}
