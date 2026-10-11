import { and, eq, isNull, sql } from "drizzle-orm";

import db from "@/db";
import { couponRedemptions, couponWinners, coupons, users } from "@/db/models";
import type { TX } from "@/lib/types";

import { normalizeCouponPhone } from "./coupon-phone";

export type ValidatedCoupon = {
  couponId: number;
  code: string;
  discountId: number;
  discountRate: number;
  discountAmount: number;
  minimumPurchaseAmount: number;
  label: string;
  winnerId: number;
};

export type CouponValidationFailure =
  | "invalid"
  | "login_required"
  | "not_winner"
  | "phone_mismatch"
  | "already_used";

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

async function resolveWinnerSlot(
  couponId: number,
  userId: number,
  tx?: TX,
): Promise<
  | { winner: typeof couponWinners.$inferSelect }
  | { failure: CouponValidationFailure }
> {
  const queryBuilder = tx ?? db;
  const user = await queryBuilder.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, phoneNumber: true },
  });

  if (!user?.phoneNumber?.trim()) {
    return { failure: "phone_mismatch" };
  }

  const accountPhone = normalizeCouponPhone(user.phoneNumber);
  const winner = await queryBuilder.query.couponWinners.findFirst({
    where: and(
      eq(couponWinners.couponId, couponId),
      eq(couponWinners.userId, userId),
    ),
  });

  if (!winner) {
    return { failure: "not_winner" };
  }

  if (winner.redeemedAt) {
    return { failure: "already_used" };
  }

  if (normalizeCouponPhone(winner.phoneNumber) !== accountPhone) {
    return { failure: "phone_mismatch" };
  }

  return { winner };
}

export async function validateCouponForCheckout(
  code: string,
  subtotal: number,
  userId?: number | null,
  tx?: TX,
): Promise<{ coupon: ValidatedCoupon } | { failure: CouponValidationFailure }> {
  const normalizedCode = normalizeCouponCode(code);
  if (!normalizedCode) {
    return { failure: "invalid" };
  }

  if (!userId) {
    return { failure: "login_required" };
  }

  const queryBuilder = tx ?? db;
  const coupon = await queryBuilder.query.coupons.findFirst({
    where: sql`upper(${coupons.code}) = ${normalizedCode}`,
    with: { discount: true, winners: true },
  });

  if (!coupon?.isActive || !coupon.discount) {
    return { failure: "invalid" };
  }

  if (!coupon.winners?.length) {
    return { failure: "not_winner" };
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    return { failure: "invalid" };
  }

  if (
    coupon.usageLimit != null
    && Number(coupon.usageCount) >= Number(coupon.usageLimit)
  ) {
    return { failure: "invalid" };
  }

  const winnerResult = await resolveWinnerSlot(coupon.id, userId, tx);
  if ("failure" in winnerResult) {
    return { failure: winnerResult.failure };
  }

  const discount = coupon.discount;
  if (discount.retailerOnly || !isDiscountScheduleActive(discount)) {
    return { failure: "invalid" };
  }

  const discountRate = Number(discount.discountValue ?? 0);
  if (!Number.isFinite(discountRate) || discountRate <= 0) {
    return { failure: "invalid" };
  }

  const minimumPurchaseAmount = Number(discount.minimumPurchaseAmount ?? 0);
  const safeSubtotal = Math.max(0, Number(subtotal) || 0);
  if (safeSubtotal < minimumPurchaseAmount) {
    return { failure: "invalid" };
  }

  const discountAmount = Math.min(
    safeSubtotal,
    Math.round((safeSubtotal * discountRate) / 100),
  );

  const label =
    String(discount.name || "").trim()
    || `${discountRate}% off`;

  return {
    coupon: {
      couponId: coupon.id,
      code: coupon.code,
      discountId: discount.id,
      discountRate,
      discountAmount,
      minimumPurchaseAmount,
      label,
      winnerId: winnerResult.winner.id,
    },
  };
}

export async function recordCouponRedemption(
  couponId: number,
  userId: number,
  orderId: number,
  winnerId: number,
  tx: TX,
) {
  const redeemedAt = new Date();

  await tx
    .update(couponWinners)
    .set({ redeemedAt, orderId })
    .where(
      and(
        eq(couponWinners.id, winnerId),
        eq(couponWinners.couponId, couponId),
        eq(couponWinners.userId, userId),
        isNull(couponWinners.redeemedAt),
      ),
    );

  await tx.insert(couponRedemptions).values({
    couponId,
    userId,
    orderId,
  });

  await tx
    .update(coupons)
    .set({
      usageCount: sql`${coupons.usageCount} + 1`,
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(eq(coupons.id, couponId));
}
