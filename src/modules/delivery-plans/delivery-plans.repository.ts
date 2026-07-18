import type { TX } from "@/lib/types";

import { and, asc, count, desc, eq, sql } from "drizzle-orm";

import db from "@/db";
import { deliveryPlans } from "@/db/models";
import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

export class DeliveryPlansRepository {
  async findById(id: number, tx?: TX) {
    const queryBuilder = tx ?? db;

    return queryBuilder.query.deliveryPlans.findFirst({
      where: eq(deliveryPlans.id, id),
      with: {
        createdByUser: true,
        updatedByUser: true,
      },
    });
  }

  async findByCode(code: string, tx?: TX) {
    const queryBuilder = tx ?? db;

    return queryBuilder.query.deliveryPlans.findFirst({
      where: eq(deliveryPlans.code, code),
    });
  }

  async listActive() {
    return db.query.deliveryPlans.findMany({
      where: eq(deliveryPlans.isActive, true),
      orderBy: [asc(deliveryPlans.sortOrder), asc(deliveryPlans.id)],
    });
  }

  async getFeeById(planId?: number | null) {
    const fallbackFee = 2000;

    if (!planId) {
      const defaultPlan = await db.query.deliveryPlans.findFirst({
        where: eq(deliveryPlans.isActive, true),
        orderBy: [asc(deliveryPlans.sortOrder), asc(deliveryPlans.id)],
      });
      return defaultPlan?.fee ?? fallbackFee;
    }

    const plan = await this.findById(Number(planId));
    if (plan?.isActive) {
      return plan.fee;
    }

    const defaultPlan = await db.query.deliveryPlans.findFirst({
      where: eq(deliveryPlans.isActive, true),
      orderBy: [asc(deliveryPlans.sortOrder), asc(deliveryPlans.id)],
    });

    return defaultPlan?.fee ?? fallbackFee;
  }

  async list(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: {
      isActive?: boolean;
      [key: string]: unknown;
    };
  }) {
    const { search, page, limit, sortBy, sortOrder, filters } = params;
    const { limit: limitVal, offset } = getPaginationValues(page, limit);

    const searchableFields = ["code", "label", "leadTime", "description"];
    const whereConditions = [];

    const filterCondition = createFilterConditions(deliveryPlans, filters);
    if (filterCondition) {
      whereConditions.push(filterCondition);
    }

    const searchCondition = createSearchCondition(
      searchableFields,
      deliveryPlans,
      search,
    );
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const sortCondition = createSortCondition(deliveryPlans, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(deliveryPlans)
        .where(whereClause || sql`TRUE`);

      const data = await tx.query.deliveryPlans.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition
          ? [sortCondition]
          : [asc(deliveryPlans.sortOrder), desc(deliveryPlans.createdAt)],
        with: {
          createdByUser: true,
          updatedByUser: true,
        },
      });

      return { data, total: totalCount, searchableFields };
    });
  }

  async create(
    tx: TX,
    data: {
      code: string;
      label: string;
      leadTime: string;
      description: string;
      fee: number;
      isActive: boolean;
      sortOrder: number;
      createdBy: number;
      updatedBy: number;
    },
  ) {
    const now = new Date().toISOString();
    const [plan] = await tx
      .insert(deliveryPlans)
      .values({
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return plan;
  }

  async update(
    tx: TX,
    id: number,
    data: Partial<{
      code: string;
      label: string;
      leadTime: string;
      description: string;
      fee: number;
      isActive: boolean;
      sortOrder: number;
      updatedBy: number;
    }>,
  ) {
    const [plan] = await tx
      .update(deliveryPlans)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(deliveryPlans.id, id))
      .returning();

    return plan;
  }

  async delete(tx: TX, id: number) {
    const [plan] = await tx
      .delete(deliveryPlans)
      .where(eq(deliveryPlans.id, id))
      .returning();

    return plan;
  }
}
