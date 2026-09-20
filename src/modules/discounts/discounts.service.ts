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
import { CategoriesService } from "../categories/categories.service";
import { ProductsService } from "../products/products.service";
import { EntriesService } from "../entries/entries.service";

const resolveTargetIds = (data: {
  targetType?: "all" | "section" | "category" | "products" | "series" | "product";
  seriesId?: number;
  productId?: number;
  section?: string;
  categoryId?: number;
  productIds?: number[];
}) => {
  if (data.targetType === "product") {
    return {
      seriesId: null,
      productId: data.productId ?? null,
      targetScope: "product",
      section: null,
      categoryId: null,
      productIds: data.productId ? [data.productId] : [],
    };
  }

  if (data.targetType === "products") {
    return {
      seriesId: null,
      productId: data.productIds?.[0] ?? null,
      targetScope: "products",
      section: null,
      categoryId: null,
      productIds: data.productIds ?? [],
    };
  }

  if (data.targetType === "section") {
    return {
      seriesId: null,
      productId: null,
      targetScope: "section",
      section: data.section ?? null,
      categoryId: null,
      productIds: [],
    };
  }

  if (data.targetType === "category") {
    return {
      seriesId: null,
      productId: null,
      targetScope: "category",
      section: null,
      categoryId: data.categoryId ?? null,
      productIds: [],
    };
  }

  if (data.targetType === "all") {
    return {
      seriesId: null,
      productId: null,
      targetScope: "all",
      section: null,
      categoryId: null,
      productIds: [],
    };
  }

  return {
    seriesId: data.seriesId ?? null,
    productId: null,
    targetScope: "series",
    section: null,
    categoryId: null,
    productIds: [],
  };
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
        targetScope: targetIds.targetScope,
        section: targetIds.section,
        categoryId: targetIds.categoryId,
        productIds: targetIds.productIds,
        retailerOnly: Boolean(data.retailerOnly),
        retailerId: data.retailerId ?? null,
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
      existingDiscount.targetScope ??
      (existingDiscount.productId ? "product" : "series");
    const targetIds = data.targetType || data.seriesId || data.productId || data.productIds || data.section || data.categoryId
      ? resolveTargetIds({
          targetType,
          seriesId: data.seriesId,
          productId: data.productId,
          section: data.section,
          categoryId: data.categoryId,
          productIds: data.productIds,
        })
      : {
          seriesId: existingDiscount.seriesId,
          productId: existingDiscount.productId,
          targetScope: existingDiscount.targetScope,
          section: existingDiscount.section,
          categoryId: existingDiscount.categoryId,
          productIds: existingDiscount.productIds || [],
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
      targetScope: targetIds.targetScope,
      section: targetIds.section,
      categoryId: targetIds.categoryId,
      productIds: targetIds.productIds,
      retailerOnly:
        data.retailerOnly !== undefined
          ? Boolean(data.retailerOnly)
          : undefined,
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

  async createRetailerDiscount(
    retailerId: number,
    userId: number,
    data: {
      targetType: "all" | "series";
      seriesId?: number;
      discountRate: number;
      isPermanent?: boolean;
      endsAt?: string;
    },
  ) {
    if (data.discountRate > 50) {
      throw new AppError("Retailer discounts cannot exceed 50%");
    }

    return this.createDiscount({
      targetType: data.targetType === "series" ? "series" : "all",
      seriesId: data.targetType === "series" ? data.seriesId : undefined,
      discountRate: data.discountRate,
      isPermanent: data.isPermanent ?? true,
      endsAt: data.endsAt,
      retailerOnly: true,
      retailerId,
      name: `Retailer discount ${data.discountRate}%`,
      createdBy: userId,
    });
  }

  async listRetailerDiscounts(retailerId: number, params: { page?: number; limit?: number }) {
    return this.discountsRepository.list({
      page: params.page ?? 1,
      limit: params.limit ?? 50,
      filters: { retailerId },
    });
  }

  async deleteRetailerDiscount(
    retailerId: number,
    discountId: number,
  ): Promise<void> {
    const discount = await this.discountsRepository.findById(discountId);
    if (!discount || discount.retailerId !== retailerId) {
      throw new NotFoundError("Discount not found");
    }

    await this.deleteDiscount(discountId);
  }

  async getFormOptions() {
    const categoriesService = new CategoriesService();
    const productsService = new ProductsService();
    const entriesService = new EntriesService();

    const [categoriesResult, productsResult, series] = await Promise.all([
      categoriesService.listCategories({
        page: 1,
        limit: 500,
        sortBy: "name",
        sortOrder: "asc",
      }),
      productsService.listProducts({
        page: 1,
        limit: 500,
        sortBy: "name",
        sortOrder: "asc",
      }),
      entriesService.getAllSeriesIds(),
    ]);

    return {
      categories: (categoriesResult.data ?? []).map((category) => ({
        id: category.id,
        name: category.name,
      })),
      products: (productsResult.data ?? []).map((product) => ({
        id: product.id,
        name: product.name || `Product #${product.id}`,
      })),
      series: (series ?? []).map((item) => ({
        id: item.id,
        seriesCode: item.seriesCode,
      })),
    };
  }
}
