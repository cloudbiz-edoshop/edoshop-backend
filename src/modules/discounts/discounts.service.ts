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

export class DiscountsService {
  private readonly discountsRepository: DiscountsRepository;

  constructor() {
    this.discountsRepository = new DiscountsRepository();
  }

  async createDiscount(
    data: CreateDiscountRequest & { createdBy: number },
  ): Promise<CreateDiscountResponse> {
    const discount = await db.transaction(async (tx) => {
      const createdDiscount = await this.discountsRepository.create(tx, {
        name: data.name ?? `Discount ${data.discountRate}%`,
        description: data.description,
        discountTypeId: data.discountTypeId ?? DiscountTypeIds.PERCENTAGE,
        discountValue: data.discountRate.toString(),
        minimumPurchaseAmount: data.minimumPurchaseAmount?.toString(),
        isActive: data.isActive ?? true,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
        seriesId: data.seriesId,
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
    const updateData = {
      ...data,
      discountValue:
        data.discountRate !== undefined
          ? data.discountRate.toString()
          : data.discountValue?.toString(),
      minimumPurchaseAmount: data.minimumPurchaseAmount?.toString(),
      startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
      endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
      updatedBy: data.updatedBy,
    };
    delete updateData.discountRate;

    const discount = await db.transaction(async (tx) => {
      const updatedDiscount = await this.discountsRepository.update(tx, id, updateData);

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
    // Parse filters if it's a string
    const parsedFilters =
      typeof params.filters === "string"
        ? JSON.parse(params.filters)
        : params.filters;

    // Convert seriesId to number if it exists
    if (parsedFilters?.seriesId) {
      parsedFilters.seriesId = Number(parsedFilters.seriesId);
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
