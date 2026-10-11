import type {
  CreateCouponRequest,
  UpdateCouponRequest,
  ValidateCouponResponse,
} from "./coupons.schema";

import db from "@/db";
import { NotFoundError, ValidationError } from "@/core/errors";

import { DiscountsRepository } from "@/modules/discounts/discounts.repository";

import { validateCouponForCheckout } from "./coupon-validation";
import { CouponsRepository } from "./coupons.repository";

const mapCouponRow = (row: Awaited<ReturnType<CouponsRepository["findById"]>>) => {
  if (!row) return null;
  return {
    ...row,
    discountName: row.discount?.name ?? undefined,
    discountRate: row.discount?.discountValue
      ? Number(row.discount.discountValue)
      : undefined,
  };
};

export class CouponsService {
  private readonly couponsRepository = new CouponsRepository();
  private readonly discountsRepository = new DiscountsRepository();

  /** Customer discounts staff can attach to a promo code (no retailer-only rows). */
  async listLinkableDiscounts() {
    const result = await this.discountsRepository.list({
      page: 1,
      limit: 500,
      sortBy: "createdAt",
      sortOrder: "desc",
      filters: { retailerOnly: false, isActive: true },
    });

    return result.data.map((row) => ({
      id: row.id,
      name: row.name,
      discountValue: Number(row.discountValue ?? 0),
    }));
  }

  async listCoupons(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, unknown>;
  }) {
    const result = await this.couponsRepository.list(params);
    return {
      ...result,
      data: result.data.map((row) => mapCouponRow(row)!),
      searchableFields: ["code"],
    };
  }

  async getCoupon(id: number) {
    const coupon = await this.couponsRepository.findById(id);
    if (!coupon) throw new NotFoundError("Coupon not found");
    return mapCouponRow(coupon);
  }

  async createCoupon(data: CreateCouponRequest & { createdBy: number }) {
    const existing = await this.couponsRepository.findByCode(data.code);
    if (existing) {
      throw new ValidationError("A coupon with this code already exists");
    }

    const created = await db.transaction(async (tx) =>
      this.couponsRepository.create(tx, {
        code: data.code,
        discountId: data.discountId,
        usageLimit: data.usageLimit ?? null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      }),
    );

    return mapCouponRow(await this.couponsRepository.findById(created.id));
  }

  async updateCoupon(
    id: number,
    data: UpdateCouponRequest & { updatedBy: number },
  ) {
    const existing = await this.couponsRepository.findById(id);
    if (!existing) throw new NotFoundError("Coupon not found");

    if (data.code) {
      const duplicate = await this.couponsRepository.findByCode(data.code);
      if (duplicate && duplicate.id !== id) {
        throw new ValidationError("A coupon with this code already exists");
      }
    }

    await db.transaction(async (tx) =>
      this.couponsRepository.update(tx, id, {
        code: data.code,
        discountId: data.discountId,
        usageLimit: data.usageLimit ?? undefined,
        expiresAt:
          data.expiresAt === undefined
            ? undefined
            : data.expiresAt
              ? new Date(data.expiresAt)
              : null,
        isActive: data.isActive,
        updatedBy: data.updatedBy,
      }),
    );

    return mapCouponRow(await this.couponsRepository.findById(id));
  }

  async deleteCoupon(id: number) {
    const existing = await this.couponsRepository.findById(id);
    if (!existing) throw new NotFoundError("Coupon not found");
    await db.transaction(async (tx) => this.couponsRepository.delete(tx, id));
  }

  async validatePublicCoupon(
    code: string,
    subtotal = 0,
  ): Promise<ValidateCouponResponse> {
    const validated = await validateCouponForCheckout(code, subtotal);
    if (!validated) {
      return { valid: false, message: "Invalid or expired coupon code" };
    }

    return {
      valid: true,
      code: validated.code,
      label: validated.label,
      discountRate: validated.discountRate,
      discountAmount: validated.discountAmount,
      minimumPurchaseAmount: validated.minimumPurchaseAmount,
    };
  }
}
