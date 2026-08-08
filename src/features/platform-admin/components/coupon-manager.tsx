"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Coupon, CouponType } from "@/db/schema";
import { saveCouponAction } from "../actions/save-coupon.action";
import { setCouponActiveAction } from "../actions/set-coupon-active.action";

interface Draft {
  code: string;
  type: CouponType;
  value: string;
  maxRedemptions: string;
  expiresAt: string;
}

const emptyDraft: Draft = { code: "", type: "percentage", value: "", maxRedemptions: "", expiresAt: "" };

export function CouponManager({ initialCoupons }: { initialCoupons: Coupon[] }) {
  const t = useTranslations("platformAdmin.coupons");
  const [coupons, setCoupons] = useState(initialCoupons);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [isSaving, setIsSaving] = useState(false);

  async function handleAdd() {
    if (!draft.code.trim() || !draft.value.trim()) return;

    setIsSaving(true);
    const result = await saveCouponAction({
      code: draft.code,
      type: draft.type,
      value: draft.value,
      maxRedemptions: draft.maxRedemptions.trim() || undefined,
      expiresAt: draft.expiresAt.trim() || undefined,
    });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setCoupons((current) => [result.data, ...current]);
    setDraft(emptyDraft);
  }

  async function toggleActive(coupon: Coupon) {
    const result = await setCouponActiveAction({ id: coupon.id, isActive: !coupon.isActive });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    setCoupons((current) => current.map((item) => (item.id === coupon.id ? result.data : item)));
  }

  return (
    <div className="space-y-4">
      {coupons.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="flex items-center justify-between gap-2 p-3 text-sm">
              <div>
                <p className="font-medium">{coupon.code}</p>
                <p className="text-xs text-muted-foreground">
                  {coupon.type === "percentage" ? t("percentageOff", { value: coupon.value }) : t("fixedOff", { value: coupon.value })}
                  {coupon.maxRedemptions != null && ` · ${t("redemptions", { used: coupon.timesRedeemed, max: coupon.maxRedemptions })}`}
                  {coupon.expiresAt && ` · ${t("expiresOn", { date: new Date(coupon.expiresAt).toISOString().slice(0, 10) })}`}
                  {!coupon.isActive && ` · ${t("inactive")}`}
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => toggleActive(coupon)}>
                {coupon.isActive ? t("deactivate") : t("reactivate")}
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-dashed p-4">
        <Input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} placeholder={t("codePlaceholder")} />
        <div className="grid grid-cols-2 gap-2">
          <Select value={draft.type} onValueChange={(value) => setDraft({ ...draft, type: value as CouponType })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">{t("percentage")}</SelectItem>
              <SelectItem value="fixed">{t("fixed")}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={draft.value}
            onChange={(event) => setDraft({ ...draft, value: event.target.value })}
            placeholder={t("valuePlaceholder")}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min="1"
            value={draft.maxRedemptions}
            onChange={(event) => setDraft({ ...draft, maxRedemptions: event.target.value })}
            placeholder={t("maxRedemptionsPlaceholder")}
          />
          <Input
            type="date"
            value={draft.expiresAt}
            onChange={(event) => setDraft({ ...draft, expiresAt: event.target.value })}
          />
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={handleAdd}>
            {t("addCoupon")}
          </Button>
        </div>
      </div>
    </div>
  );
}
