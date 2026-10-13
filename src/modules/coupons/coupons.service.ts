import type {
  CreateCouponRequest,
  ImportGoogleQuizRequest,
  UpdateCouponRequest,
  ValidateCouponResponse,
} from "./coupons.schema";

import db from "@/db";
import { NotFoundError, ValidationError } from "@/core/errors";

import { DiscountsRepository } from "@/modules/discounts/discounts.repository";

import { normalizeCouponPhone } from "./coupon-phone";
import { validateCouponForCheckout } from "./coupon-validation";
import { UserRepository } from "@/modules/users/users.repository";

import { CouponsRepository } from "./coupons.repository";
import { GoogleQuizImportService } from "./google-quiz-import.service";

const mapCouponWinners = (
  winners: NonNullable<
    Awaited<ReturnType<CouponsRepository["findById"]>>
  >["winners"],
) =>
  (winners ?? []).map((winner) => ({
    id: winner.id,
    userId: winner.userId,
    phoneNumber: winner.phoneNumber,
    fullName: winner.fullName,
    redeemedAt: winner.redeemedAt
      ? new Date(winner.redeemedAt).toISOString()
      : null,
    orderId: winner.orderId ?? null,
  }));

const mapCouponRow = (row: Awaited<ReturnType<CouponsRepository["findById"]>>) => {
  if (!row) return null;
  return {
    ...row,
    expiresAt: row.expiresAt
      ? new Date(row.expiresAt).toISOString()
      : null,
    discountName: row.discount?.name ?? undefined,
    discountRate: row.discount?.discountValue
      ? Number(row.discount.discountValue)
      : undefined,
    winners: mapCouponWinners(row.winners),
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

    if (!data.expiresAt) {
      throw new ValidationError("Expiration date is required for promo codes");
    }

    const winnerCount = data.winners.length;
    const usageLimit = data.usageLimit ?? winnerCount;

    const created = await db.transaction(async (tx) => {
      const coupon = await this.couponsRepository.create(tx, {
        code: data.code,
        discountId: data.discountId,
        usageLimit,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      });

      await this.couponsRepository.replaceWinners(
        tx,
        coupon.id,
        data.winners.map((winner) => ({
          userId: winner.userId,
          phoneNumber: normalizeCouponPhone(winner.phoneNumber),
          fullName: winner.fullName.trim(),
        })),
      );

      return coupon;
    });

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

  async importWinnersFromGoogleQuiz(body: ImportGoogleQuizRequest) {
    const importer = new GoogleQuizImportService(new UserRepository());
    try {
      return await importer.importWinnersFromSheet(body);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not import quiz results";
      throw new ValidationError(message);
    }
  }

  async validatePublicCoupon(
    code: string,
    subtotal = 0,
    userId?: number | null,
  ): Promise<ValidateCouponResponse> {
    const result = await validateCouponForCheckout(code, subtotal, userId);
    if ("failure" in result) {
      if (result.failure === "login_required") {
        return {
          valid: false,
          message: "Please log in to use a promo code",
        };
      }
      if (result.failure === "already_used") {
        return {
          valid: false,
          message: "You have already used this promo code",
        };
      }
      if (result.failure === "not_winner") {
        return {
          valid: false,
          message: "This promo code is not assigned to your account",
        };
      }
      if (result.failure === "phone_mismatch") {
        return {
          valid: false,
          message:
            "Use the WhatsApp phone number on your account that was registered for this promo",
        };
      }
      if (result.failure === "name_mismatch") {
        return {
          valid: false,
          message:
            "Your account full name must match the name registered for this promo",
        };
      }
      return { valid: false, message: "Invalid or expired promo code" };
    }

    const validated = result.coupon;
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
