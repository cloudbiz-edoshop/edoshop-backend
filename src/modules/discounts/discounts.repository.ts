import type { TX } from "@/lib/types";

import { and, count, desc, eq, sql } from "drizzle-orm";

import db from "@/db";
import { discounts } from "@/db/models";
import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

export class DiscountsRepository {
  async findById(id: number, tx?: TX) {
    const queryBuilder = tx ?? db;

    const discount = await queryBuilder.query.discounts.findFirst({
      where: eq(discounts.id, id),
      with: {
        series: true,
        discountType: true,
        createdByUser: true,
        updatedByUser: true,
      },
    });

    if (!discount) {
      return null;
    }

    return discount;
  }

  async list(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: {
      seriesId?: number;
      isActive?: boolean;
      [key: string]: any;
    };
  }) {
    const { search, page, limit, sortBy, sortOrder, filters } = params;
    const { limit: limitVal, offset } = getPaginationValues(page, limit);

    const searchableFields = ["name", "description"];
    const whereConditions = [];

    // Handle seriesId filter
    if (filters?.seriesId) {
      whereConditions.push(eq(discounts.seriesId, Number(filters.seriesId)));
    }

    // Add other filters
    const otherFilters = { ...filters };
    delete otherFilters.seriesId;
    const filterCondition = createFilterConditions(discounts, otherFilters);
    if (filterCondition) {
      whereConditions.push(filterCondition);
    }

    // Add search
    const searchCondition = createSearchCondition(
      searchableFields,
      discounts,
      search,
    );
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const sortCondition = createSortCondition(discounts, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(discounts)
        .where(whereClause || sql`TRUE`);

      const discountsData = await tx.query.discounts.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(discounts.createdAt)],
        with: {
          series: true,
          discountType: true,
          createdByUser: true,
          updatedByUser: true,
        },
      });

      return { data: discountsData, total: totalCount, searchableFields };
    });
  }

  async create(
    tx: TX,
    data: {
      name: string;
      description?: string;
      discountTypeId: number;
      discountValue: string;
      minimumPurchaseAmount?: string;
      seriesId: number;
      isActive: boolean;
      startsAt?: Date;
      endsAt?: Date;
      createdBy: number;
      updatedBy: number;
    },
  ) {
    const [discount] = await tx
      .insert(discounts)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning();

    return discount;
  }

  async update(
    tx: TX,
    id: number,
    data: Partial<{
      name: string;
      description: string;
      discountTypeId: number;
      discountValue: string;
      minimumPurchaseAmount?: string;
      seriesId: number;
      isActive: boolean;
      startsAt: Date;
      endsAt: Date;
      updatedBy: number;
    }>,
  ) {
    const [discount] = await tx
      .update(discounts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(discounts.id, id))
      .returning();

    return discount;
  }

  async delete(tx: TX, id: number) {
    const [discount] = await tx
      .delete(discounts)
      .where(eq(discounts.id, id))
      .returning();

    return discount;
  }
}
