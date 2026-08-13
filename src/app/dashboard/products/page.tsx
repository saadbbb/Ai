import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { ProductManager } from "@/features/knowledge-base/components/product-manager";
import { productRepository } from "@/features/knowledge-base/repository/product.repository";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function ProductsPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "knowledge_base");
  const t = await getTranslations("productsPage");

  const products = await productRepository.findByWorkspaceId(workspace.id);

  return (
    <PageContainer>
      <PageHeader title={t("pageTitle")} description={t("pageDescription")} />
      <ProductManager initialProducts={products} />
    </PageContainer>
  );
}
