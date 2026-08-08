import { getTranslations } from "next-intl/server";
import { CouponManager } from "@/features/platform-admin/components/coupon-manager";
import { couponRepository } from "@/features/platform-admin/repository/coupon.repository";

export default async function AdminCouponsPage() {
  const t = await getTranslations("platformAdmin.coupons");
  const coupons = await couponRepository.findAll();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <CouponManager initialCoupons={coupons} />
    </div>
  );
}
