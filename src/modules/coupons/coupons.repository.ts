import type { TX } from "@/lib/types";

import { and, count, desc, eq, sql } from "drizzle-orm";

import db from "@/db";
import { coupons } from "@/db/models";
import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

export class CouponsRepository {
  async findById(id: number, tx?: TX) {
    const queryBuilder = tx ?? db;
    return queryBuilder.query.coupons.findFirst({
      where: eq(coupons.id, id),
      with: { discount: true },
    });
  }

  async findByCode(code: string, tx?: TX) {
    const queryBuilder = tx ?? db;
    const normalized = code.trim().toUpperCase();
    return queryBuilder.query.coupons.findFirst({
      where: sql`upper(${coupons.code}) = ${normalized}`,
      with: { discount: true },
    });
  }

  async list(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, unknown>;
  }) {
    const { search, page, limit, sortBy, sortOrder, filters } = params;
    const { limit: limitVal, offset } = getPaginationValues(page, limit);
    const searchableFields = ["code"];
    const whereConditions = [];

    const filterCondition = createFilterConditions(coupons, filters);
    if (filterCondition) whereConditions.push(filterCondition);

    const searchCondition = createSearchCondition(
      searchableFields,
      coupons,
      search,
    );
    if (searchCondition) whereConditions.push(searchCondition);

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;
    const sortCondition = createSortCondition(coupons, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(coupons)
        .where(whereClause || sql`TRUE`);

      const rows = await tx.query.coupons.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ?? [desc(coupons.createdAt)],
        with: { discount: true },
      });

      return { data: rows, total: totalCount };
    });
  }

  async create(
    tx: TX,
    data: {
      code: string;
      discountId: number;
      usageLimit?: number | null;
      expiresAt?: Date | null;
      isActive?: boolean;
      createdBy: number;
      updatedBy: number;
    },
  ) {
    const [row] = await tx
      .insert(coupons)
      .values({
        code: data.code.trim().toUpperCase(),
        discountId: data.discountId,
        usageLimit: data.usageLimit ?? null,
        expiresAt: data.expiresAt ?? null,
        isActive: data.isActive ?? true,
        usageCount: 0,
        createdBy: data.createdBy,
        updatedBy: data.updatedBy,
        updatedAt: new Date(),
      })
      .returning();
    return row;
  }

  async update(
    tx: TX,
    id: number,
    data: Partial<{
      code: string;
      discountId: number;
      usageLimit: number | null;
      expiresAt: Date | null;
      isActive: boolean;
      updatedBy: number;
    }>,
  ) {
    const [row] = await tx
      .update(coupons)
      .set({
        ...(data.code !== undefined
          ? { code: data.code.trim().toUpperCase() }
          : {}),
        ...(data.discountId !== undefined ? { discountId: data.discountId } : {}),
        ...(data.usageLimit !== undefined ? { usageLimit: data.usageLimit } : {}),
        ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        updatedBy: data.updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(coupons.id, id))
      .returning();
    return row;
  }

  async delete(tx: TX, id: number) {
    await tx.delete(coupons).where(eq(coupons.id, id));
  }
}
