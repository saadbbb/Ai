import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { RefundManager } from "@/features/platform-admin/components/refund-manager";
import { invoiceRepository } from "@/features/platform-admin/repository/invoice.repository";
import { refundRepository } from "@/features/platform-admin/repository/refund.repository";

export default async function AdminRefundsPage() {
  const t = await getTranslations("platformAdmin.refunds");
  const [refunds, invoices] = await Promise.all([
    refundRepository.findAllWithWorkspace(),
    invoiceRepository.findRecentWithWorkspace(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <RefundManager initialRefunds={refunds} invoices={invoices} />
    </div>
  );
}
