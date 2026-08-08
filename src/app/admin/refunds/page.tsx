import { getTranslations } from "next-intl/server";
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
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <RefundManager initialRefunds={refunds} invoices={invoices} />
    </div>
  );
}
