import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { CouponManager } from "@/features/platform-admin/components/coupon-manager";
import { couponRepository } from "@/features/platform-admin/repository/coupon.repository";

export default async function AdminCouponsPage() {
  const t = await getTranslations("platformAdmin.coupons");
  const coupons = await couponRepository.findAll();

  return (
    <PageContainer>
      <PageHeader title={t("title")} description={t("description")} />
      <CouponManager initialCoupons={coupons} />
    </PageContainer>
  );
}
