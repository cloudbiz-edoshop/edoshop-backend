import type {
  AssignOrdersToBundleRequest,
  CreateTrackingBundleRequest,
  UpdateBundleStepRequest,
  UpdateTrackingBundleRequest,
} from "./tracking-bundles.schema";

import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import db from "@/db";
import {
  orders,
  trackingBundleHistory,
  trackingBundleItems,
  trackingBundles,
  trackingSteps,
  users,
} from "@/db/models";
import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

export class TrackingBundlesRepository {
  async listSteps() {
    return db.query.trackingSteps.findMany({
      orderBy: [trackingSteps.stepOrder],
    });
  }

  async findById(id: number) {
    return db.query.trackingBundles.findFirst({
      where: eq(trackingBundles.id, id),
      with: {
        currentStep: true,
        items: true,
        history: {
          with: {
            step: true,
            createdByUser: true,
          },
          orderBy: [desc(trackingBundleHistory.createdAt)],
        },
      },
    });
  }

  async findByBundleCode(bundleCode: string) {
    return db.query.trackingBundles.findFirst({
      where: eq(trackingBundles.bundleCode, bundleCode),
    });
  }

  async findBundleByOrderId(orderId: number) {
    const item = await db.query.trackingBundleItems.findFirst({
      where: eq(trackingBundleItems.orderId, orderId),
      with: {
        bundle: {
          with: {
            currentStep: true,
            history: {
              with: {
                step: true,
                createdByUser: true,
              },
              orderBy: [desc(trackingBundleHistory.createdAt)],
            },
          },
        },
      },
    });

    return item?.bundle ?? null;
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
    const searchableFields = ["bundleCode", "name", "description", "storeType", "status"];
    const filterCondition = createFilterConditions(trackingBundles, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      trackingBundles,
      search,
    );

    const whereConditions = [];
    if (filterCondition) whereConditions.push(filterCondition);
    if (searchCondition) whereConditions.push(searchCondition);

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const { offset, limit: pageLimit } = getPaginationValues(page, limit);
    const orderBy = createSortCondition(
      trackingBundles,
      sortBy || "createdAt",
      sortOrder || "desc",
    );

    const [data, totalResult] = await Promise.all([
      db.query.trackingBundles.findMany({
        where: whereClause,
        with: { currentStep: true },
        orderBy: orderBy ? [orderBy] : [desc(trackingBundles.createdAt)],
        limit: pageLimit,
        offset,
      }),
      db.select({ total: count() }).from(trackingBundles).where(whereClause),
    ]);

    const bundleIds = data.map((bundle) => bundle.id);
    const orderCounts = bundleIds.length
      ? await db
          .select({
            bundleId: trackingBundleItems.bundleId,
            total: count(),
          })
          .from(trackingBundleItems)
          .where(inArray(trackingBundleItems.bundleId, bundleIds))
          .groupBy(trackingBundleItems.bundleId)
      : [];

    const countByBundleId = new Map(
      orderCounts.map((row) => [row.bundleId, Number(row.total)]),
    );

    return {
      data: data.map((bundle) => ({
        ...bundle,
        orderCount: countByBundleId.get(bundle.id) ?? 0,
      })),
      total: Number(totalResult[0]?.total ?? 0),
      searchableFields,
    };
  }

  async create(payload: CreateTrackingBundleRequest, userId: number) {
    const firstStep = await db.query.trackingSteps.findFirst({
      orderBy: [trackingSteps.stepOrder],
    });

    if (!firstStep) {
      throw new Error("Tracking steps are not configured");
    }

    const now = new Date().toISOString();
    const [created] = await db
      .insert(trackingBundles)
      .values({
        bundleCode: payload.bundleCode.trim(),
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        storeType: payload.storeType,
        status: payload.status || "active",
        currentStepId: firstStep.id,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    await db.insert(trackingBundleHistory).values({
      bundleId: created.id,
      stepId: firstStep.id,
      notes: "Bundle created",
      createdAt: now,
      createdBy: userId,
    });

    return this.findById(created.id);
  }

  async update(id: number, payload: UpdateTrackingBundleRequest, userId: number) {
    const now = new Date().toISOString();
    await db
      .update(trackingBundles)
      .set({
        ...(payload.bundleCode ? { bundleCode: payload.bundleCode.trim() } : {}),
        ...(payload.name ? { name: payload.name.trim() } : {}),
        ...(payload.description !== undefined
          ? { description: payload.description?.trim() || null }
          : {}),
        ...(payload.storeType ? { storeType: payload.storeType } : {}),
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.currentStepId ? { currentStepId: payload.currentStepId } : {}),
        updatedAt: now,
        updatedBy: userId,
      })
      .where(eq(trackingBundles.id, id));

    return this.findById(id);
  }

  async searchOrder(orderCode: string) {
    const order = await db.query.orders.findFirst({
      where: and(
        ilike(orders.orderCode, orderCode.trim()),
        eq(orders.isDeleted, false),
      ),
      with: {
        orderStatus: true,
        orderType: true,
      },
    });

    if (!order) return null;

    const existingAssignment = await db.query.trackingBundleItems.findFirst({
      where: eq(trackingBundleItems.orderId, order.id),
      with: { bundle: true },
    });

    return {
      order,
      existingAssignment,
    };
  }

  async assignOrders(
    bundleId: number,
    payload: AssignOrdersToBundleRequest,
    userId: number,
  ) {
    const normalizedCodes = [
      ...new Set(payload.orderCodes.map((code) => code.trim()).filter(Boolean)),
    ];

    const matchedOrders = await db.query.orders.findMany({
      where: and(
        inArray(orders.orderCode, normalizedCodes),
        eq(orders.isDeleted, false),
      ),
      with: {
        orderStatus: true,
      },
    });

    if (!matchedOrders.length) {
      return { assigned: [], missing: normalizedCodes };
    }

    const now = new Date().toISOString();
    const assigned = [];

    for (const order of matchedOrders) {
      const existing = await db.query.trackingBundleItems.findFirst({
        where: eq(trackingBundleItems.orderId, order.id),
      });

      if (existing) {
        if (existing.bundleId !== bundleId) {
          throw new Error(
            `Order ${order.orderCode} is already assigned to another bundle`,
          );
        }
        continue;
      }

      await db.insert(trackingBundleItems).values({
        bundleId,
        orderId: order.id,
        createdAt: now,
        createdBy: userId,
      });

      assigned.push(order);
    }

    const missing = normalizedCodes.filter(
      (code) => !matchedOrders.some((order) => order.orderCode === code),
    );

    return { assigned, missing };
  }

  async removeOrder(bundleId: number, orderId: number) {
    await db
      .delete(trackingBundleItems)
      .where(
        and(
          eq(trackingBundleItems.bundleId, bundleId),
          eq(trackingBundleItems.orderId, orderId),
        ),
      );
  }

  async updateStep(
    bundleId: number,
    payload: UpdateBundleStepRequest,
    userId: number,
  ) {
    const step = await db.query.trackingSteps.findFirst({
      where: eq(trackingSteps.id, payload.stepId),
    });

    if (!step) {
      throw new Error("Tracking step not found");
    }

    const now = new Date().toISOString();

    await db
      .update(trackingBundles)
      .set({
        currentStepId: payload.stepId,
        updatedAt: now,
        updatedBy: userId,
      })
      .where(eq(trackingBundles.id, bundleId));

    await db.insert(trackingBundleHistory).values({
      bundleId,
      stepId: payload.stepId,
      notes: payload.notes?.trim() || null,
      attachmentUrl: payload.attachmentUrl?.trim() || null,
      createdAt: now,
      createdBy: userId,
    });

    return this.findById(bundleId);
  }

  async getBundleOrders(bundleId: number) {
    const items = await db.query.trackingBundleItems.findMany({
      where: eq(trackingBundleItems.bundleId, bundleId),
      orderBy: [desc(trackingBundleItems.createdAt)],
    });

    if (!items.length) return [];

    const orderIds = items.map((item) => item.orderId);
    const bundleOrders = await db.query.orders.findMany({
      where: inArray(orders.id, orderIds),
      with: { orderStatus: true },
    });

    return bundleOrders.map((order) => ({
      id: order.id,
      orderId: order.id,
      orderCode: order.orderCode,
      customerId: order.customerId,
      totalAmount: String(order.totalAmount),
      status: order.orderStatus?.name ?? "pending",
      createdAt: order.createdAt,
    }));
  }
}
