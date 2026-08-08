import { invoiceRepository } from "@/features/platform-admin/repository/invoice.repository";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { pdfResponse, toPdfBuffer } from "@/lib/pdf";

interface RouteParams {
  params: Promise<{ invoiceId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { invoiceId } = await params;
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  const invoice = await invoiceRepository.findById(invoiceId, workspace.id);
  if (!invoice) {
    return new Response("Invoice not found.", { status: 404 });
  }

  const buffer = await toPdfBuffer(`Invoice ${invoice.invoiceNumber}`, ["Field", "Value"], [
    ["Invoice Number", invoice.invoiceNumber],
    ["Workspace", workspace.name],
    ["Plan", invoice.planName],
    ["Amount", `${invoice.amount} ${invoice.currency}`],
    ["Status", invoice.status],
    ["Billing Period", `${invoice.periodDays} days`],
    ["Issued", invoice.issuedAt.toISOString().slice(0, 10)],
    ["Paid", invoice.paidAt ? invoice.paidAt.toISOString().slice(0, 10) : "-"],
  ]);

  return pdfResponse(invoice.invoiceNumber, buffer);
}
