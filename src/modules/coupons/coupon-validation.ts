import { eq, sql } from "drizzle-orm";

import db from "@/db";
import { coupons } from "@/db/models";
import type { TX } from "@/lib/types";

export type ValidatedCoupon = {
  couponId: number;
  code: string;
  discountId: number;
  discountRate: number;
  discountAmount: number;
  minimumPurchaseAmount: number;
  label: string;
};

const normalizeCouponCode = (code: string) =>
  String(code || "").trim().toUpperCase();

const isDiscountScheduleActive = (discount: {
  isActive?: boolean | null;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
}) => {
  if (!discount.isActive) return false;
  const now = Date.now();
  const startsAt = discount.startsAt ? new Date(discount.startsAt).getTime() : null;
  const endsAt = discount.endsAt ? new Date(discount.endsAt).getTime() : null;
  if (startsAt && startsAt > now) return false;
  if (endsAt && endsAt < now) return false;
  return true;
};

export async function validateCouponForCheckout(
  code: string,
  subtotal: number,
): Promise<ValidatedCoupon | null> {
  const normalizedCode = normalizeCouponCode(code);
  if (!normalizedCode) return null;

  const coupon = await db.query.coupons.findFirst({
    where: sql`upper(${coupons.code}) = ${normalizedCode}`,
    with: { discount: true },
  });

  if (!coupon?.isActive || !coupon.discount) {
    return null;
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    return null;
  }

  if (
    coupon.usageLimit != null
    && Number(coupon.usageCount) >= Number(coupon.usageLimit)
  ) {
    return null;
  }

  const discount = coupon.discount;
  if (discount.retailerOnly || !isDiscountScheduleActive(discount)) {
    return null;
  }

  const discountRate = Number(discount.discountValue ?? 0);
  if (!Number.isFinite(discountRate) || discountRate <= 0) {
    return null;
  }

  const minimumPurchaseAmount = Number(discount.minimumPurchaseAmount ?? 0);
  const safeSubtotal = Math.max(0, Number(subtotal) || 0);
  if (safeSubtotal < minimumPurchaseAmount) {
    return null;
  }

  const discountAmount = Math.min(
    safeSubtotal,
    Math.round((safeSubtotal * discountRate) / 100),
  );

  const label =
    String(discount.name || "").trim()
    || `${discountRate}% off`;

  return {
    couponId: coupon.id,
    code: coupon.code,
    discountId: discount.id,
    discountRate,
    discountAmount,
    minimumPurchaseAmount,
    label,
  };
}

export async function incrementCouponUsage(
  couponId: number,
  userId: number,
  tx: TX,
) {
  await tx
    .update(coupons)
    .set({
      usageCount: sql`${coupons.usageCount} + 1`,
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(eq(coupons.id, couponId));
}
