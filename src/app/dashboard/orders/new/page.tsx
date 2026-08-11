import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { productRepository } from "@/features/knowledge-base/repository/product.repository";
import { NewOrderForm } from "@/features/orders/components/new-order-form";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

interface PageProps {
  searchParams: Promise<{ contactId?: string }>;
}

export default async function NewOrderPage({ searchParams }: PageProps) {
  const { contactId } = await searchParams;
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const t = await getTranslations("orders.new");

  const [contacts, products] = await Promise.all([
    contactRepository.findByWorkspaceId(workspace.id),
    productRepository.findByWorkspaceId(workspace.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <NewOrderForm contacts={contacts} products={products} defaultContactId={contactId} />
    </div>
  );
}
