import type {
  CreateDiscountRequest,
  CreateDiscountResponse,
  UpdateDiscountRequest,
} from "./discounts.schema";
import { DiscountTypeIds } from "@/constants/discount-types.constants";
import { NotFoundError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";

import db from "@/db";

import { DiscountsRepository } from "./discounts.repository";

const resolveTargetIds = (data: {
  targetType?: "series" | "product";
  seriesId?: number;
  productId?: number;
}) => {
  if (data.targetType === "product") {
    return { seriesId: null, productId: data.productId ?? null };
  }

  return { seriesId: data.seriesId ?? null, productId: null };
};

const resolveEndsAt = (data: {
  isPermanent?: boolean;
  endsAt?: string;
}) => {
  if (data.isPermanent ?? !data.endsAt) {
    return null;
  }

  return new Date(data.endsAt);
};

export const isDiscountCurrentlyActive = (
  discount: {
    isActive?: boolean | null;
    startsAt?: Date | string | null;
    endsAt?: Date | string | null;
  },
  now = new Date(),
) => {
  if (discount.isActive === false) {
    return false;
  }

  if (discount.startsAt && new Date(discount.startsAt) > now) {
    return false;
  }

  if (discount.endsAt && new Date(discount.endsAt) < now) {
    return false;
  }

  return true;
};

export class DiscountsService {
  private readonly discountsRepository: DiscountsRepository;

  constructor() {
    this.discountsRepository = new DiscountsRepository();
  }

  async createDiscount(
    data: CreateDiscountRequest & { createdBy: number },
  ): Promise<CreateDiscountResponse> {
    const targetIds = resolveTargetIds(data);
    const discount = await db.transaction(async (tx) => {
      const createdDiscount = await this.discountsRepository.create(tx, {
        name: data.name ?? `Discount ${data.discountRate}%`,
        description: data.description,
        discountTypeId: data.discountTypeId ?? DiscountTypeIds.PERCENTAGE,
        discountValue: data.discountRate.toString(),
        minimumPurchaseAmount: data.minimumPurchaseAmount?.toString(),
        isActive: data.isActive ?? true,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        endsAt: resolveEndsAt(data),
        seriesId: targetIds.seriesId,
        productId: targetIds.productId,
        updatedBy: data.createdBy,
        createdBy: data.createdBy,
      });

      return createdDiscount;
    });

    const discountWithRelations = await this.discountsRepository.findById(
      discount.id,
    );

    if (!discountWithRelations) {
      throw new AppError("Discount could not be fetched after creation");
    }

    return discountWithRelations as CreateDiscountResponse;
  }

  async getDiscountById(id: number): Promise<CreateDiscountResponse> {
    const discount = await this.discountsRepository.findById(id);
    if (!discount) {
      throw new NotFoundError("Discount not found");
    }
    return discount as CreateDiscountResponse;
  }

  async updateDiscount(
    id: number,
    data: UpdateDiscountRequest & { updatedBy: number },
  ): Promise<CreateDiscountResponse> {
    const existingDiscount = await this.discountsRepository.findById(id);
    if (!existingDiscount) {
      throw new NotFoundError("Discount not found");
    }

    const targetType =
      data.targetType ??
      (existingDiscount.productId ? "product" : "series");
    const targetIds = data.targetType || data.seriesId || data.productId
      ? resolveTargetIds({
          targetType,
          seriesId: data.seriesId,
          productId: data.productId,
        })
      : {
          seriesId: existingDiscount.seriesId,
          productId: existingDiscount.productId,
        };

    const updateData: Record<string, unknown> = {
      name: data.name,
      description: data.description,
      discountTypeId: data.discountTypeId,
      discountValue:
        data.discountRate !== undefined
          ? data.discountRate.toString()
          : data.discountValue?.toString(),
      minimumPurchaseAmount: data.minimumPurchaseAmount?.toString(),
      isActive: data.isActive,
      startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
      seriesId: targetIds.seriesId,
      productId: targetIds.productId,
      updatedBy: data.updatedBy,
    };

    if (data.isPermanent !== undefined || data.endsAt !== undefined) {
      updateData.endsAt = resolveEndsAt({
        isPermanent: data.isPermanent,
        endsAt: data.endsAt,
      });
    }

    const discount = await db.transaction(async (tx) => {
      const updatedDiscount = await this.discountsRepository.update(
        tx,
        id,
        updateData,
      );

      if (!updatedDiscount) {
        throw new NotFoundError("Discount not found");
      }

      return updatedDiscount;
    });

    const discountWithRelations = await this.discountsRepository.findById(
      discount.id,
    );
    if (!discountWithRelations) {
      throw new AppError("Discount could not be fetched after update");
    }

    return discountWithRelations as CreateDiscountResponse;
  }

  async deleteDiscount(id: number): Promise<void> {
    const discount = await this.discountsRepository.findById(id);
    if (!discount) {
      throw new NotFoundError("Discount not found");
    }

    await db.transaction(async (tx) => {
      await this.discountsRepository.delete(tx, id);
    });
  }

  async listDiscounts(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: string | Record<string, any>;
  }) {
    const parsedFilters =
      typeof params.filters === "string"
        ? JSON.parse(params.filters)
        : params.filters;

    if (parsedFilters?.seriesId) {
      parsedFilters.seriesId = Number(parsedFilters.seriesId);
    }

    if (parsedFilters?.productId) {
      parsedFilters.productId = Number(parsedFilters.productId);
    }

    return await this.discountsRepository.list({
      ...params,
      filters: parsedFilters,
    });
  }

  async getDiscountsBySeries(seriesId: number) {
    return await this.discountsRepository.list({
      page: 1,
      limit: 100,
      filters: { seriesId },
    });
  }
}
