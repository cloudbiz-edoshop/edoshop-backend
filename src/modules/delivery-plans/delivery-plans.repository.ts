import type { TX } from "@/lib/types";

import { and, asc, count, desc, eq, sql } from "drizzle-orm";

import db from "@/db";
import { deliveryFeeRules, deliveryPlans } from "@/db/models";
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

  async listFeeRules(deliveryPlanId: number) {
    return db.query.deliveryFeeRules.findMany({
      where: eq(deliveryFeeRules.deliveryPlanId, deliveryPlanId),
      orderBy: [asc(deliveryFeeRules.sortOrder), asc(deliveryFeeRules.id)],
    });
  }

  async findFeeRuleById(ruleId: number, deliveryPlanId: number) {
    return db.query.deliveryFeeRules.findFirst({
      where: and(
        eq(deliveryFeeRules.id, ruleId),
        eq(deliveryFeeRules.deliveryPlanId, deliveryPlanId),
      ),
    });
  }

  async createFeeRule(
    deliveryPlanId: number,
    data: {
      minDistanceKm: number;
      maxDistanceKm?: number | null;
      minWeightKg: number;
      maxWeightKg?: number | null;
      maxLengthCm?: number | null;
      maxWidthCm?: number | null;
      maxHeightCm?: number | null;
      fee: number;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    const now = new Date().toISOString();
    const [rule] = await db
      .insert(deliveryFeeRules)
      .values({
        deliveryPlanId,
        minDistanceKm: String(data.minDistanceKm),
        maxDistanceKm:
          data.maxDistanceKm != null ? String(data.maxDistanceKm) : null,
        minWeightKg: String(data.minWeightKg),
        maxWeightKg:
          data.maxWeightKg != null ? String(data.maxWeightKg) : null,
        maxLengthCm: data.maxLengthCm ?? null,
        maxWidthCm: data.maxWidthCm ?? null,
        maxHeightCm: data.maxHeightCm ?? null,
        fee: data.fee,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return rule;
  }

  async updateFeeRule(
    ruleId: number,
    deliveryPlanId: number,
    data: Partial<{
      minDistanceKm: number;
      maxDistanceKm: number | null;
      minWeightKg: number;
      maxWeightKg: number | null;
      maxLengthCm: number | null;
      maxWidthCm: number | null;
      maxHeightCm: number | null;
      fee: number;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) {
    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.minDistanceKm != null) {
      updates.minDistanceKm = String(data.minDistanceKm);
    }
    if (data.maxDistanceKm !== undefined) {
      updates.maxDistanceKm =
        data.maxDistanceKm != null ? String(data.maxDistanceKm) : null;
    }
    if (data.minWeightKg != null) {
      updates.minWeightKg = String(data.minWeightKg);
    }
    if (data.maxWeightKg !== undefined) {
      updates.maxWeightKg =
        data.maxWeightKg != null ? String(data.maxWeightKg) : null;
    }
    if (data.maxLengthCm !== undefined) {
      updates.maxLengthCm = data.maxLengthCm;
    }
    if (data.maxWidthCm !== undefined) {
      updates.maxWidthCm = data.maxWidthCm;
    }
    if (data.maxHeightCm !== undefined) {
      updates.maxHeightCm = data.maxHeightCm;
    }
    if (data.fee != null) {
      updates.fee = data.fee;
    }
    if (data.sortOrder != null) {
      updates.sortOrder = data.sortOrder;
    }
    if (data.isActive != null) {
      updates.isActive = data.isActive;
    }

    const [rule] = await db
      .update(deliveryFeeRules)
      .set(updates)
      .where(
        and(
          eq(deliveryFeeRules.id, ruleId),
          eq(deliveryFeeRules.deliveryPlanId, deliveryPlanId),
        ),
      )
      .returning();

    return rule;
  }

  async deleteFeeRule(ruleId: number, deliveryPlanId: number) {
    const [rule] = await db
      .delete(deliveryFeeRules)
      .where(
        and(
          eq(deliveryFeeRules.id, ruleId),
          eq(deliveryFeeRules.deliveryPlanId, deliveryPlanId),
        ),
      )
      .returning();

    return rule;
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
