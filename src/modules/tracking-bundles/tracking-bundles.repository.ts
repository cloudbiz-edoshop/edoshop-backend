import type {
  AssignOrdersToBundleRequest,
  CreateTrackingBundleRequest,
  UpdateBundleStepRequest,
  UpdateTrackingBundleRequest,
} from "./tracking-bundles.schema";

import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import db from "@/db";
import {
  bundles as sourceBundles,
  customers,
  entries,
  items as inventoryItems,
  orderItems,
  orders,
  series,
  suppliers,
  trackingBundleHistory,
  trackingBundleItems,
  trackingBundles,
  trackingSteps,
  users,
  variants,
} from "@/db/models";
import {
  getPaginationValues,
} from "@/lib/searching-sorting";

export class TrackingBundlesRepository {
  async listSteps() {
    return db.query.trackingSteps.findMany({
      orderBy: [trackingSteps.stepOrder],
    });
  }

  async findById(id: number) {
    const bySourceBundle = await db.query.trackingBundles.findFirst({
      where: eq(trackingBundles.sourceBundleId, id),
      with: {
        currentStep: true,
        sourceBundle: {
          with: {
            entry: {
              with: {
                supplier: true,
              },
            },
          },
        },
        history: {
          with: {
            step: true,
            createdByUser: true,
          },
          orderBy: [desc(trackingBundleHistory.createdAt)],
        },
      },
    });

    if (bySourceBundle) return bySourceBundle;

    const byTrackingBundle = await db.query.trackingBundles.findFirst({
      where: eq(trackingBundles.id, id),
      with: {
        currentStep: true,
        sourceBundle: {
          with: {
            entry: {
              with: {
                supplier: true,
              },
            },
          },
        },
        history: {
          with: {
            step: true,
            createdByUser: true,
          },
          orderBy: [desc(trackingBundleHistory.createdAt)],
        },
      },
    });

    if (byTrackingBundle) return byTrackingBundle;

    return this.ensureTrackingForSourceBundle(id);
  }

  async findByBundleCode(bundleCode: string) {
    return db.query.trackingBundles.findFirst({
      where: eq(trackingBundles.bundleCode, bundleCode),
    });
  }

  async findBundleByOrderId(orderId: number) {
    const [row] = await db
      .select({ sourceBundleId: series.bundleId })
      .from(orderItems)
      .innerJoin(variants, eq(orderItems.variantId, variants.id))
      .innerJoin(inventoryItems, eq(variants.itemId, inventoryItems.id))
      .innerJoin(series, eq(inventoryItems.seriesId, series.id))
      .where(eq(orderItems.orderId, orderId))
      .limit(1);

    if (!row?.sourceBundleId) return null;
    return this.findById(row.sourceBundleId);
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
    const searchableFields = ["bundleCode", "supplierName", "storeType", "status"];
    const parsedFilters = filters ?? {};
    const storeTypeFilter = String(parsedFilters.storeType || "");

    const searchCondition = search
      ? or(
          ilike(sourceBundles.bundleCode, `%${search}%`),
          ilike(suppliers.storeName, `%${search}%`),
          ilike(suppliers.supplierCode, `%${search}%`),
        )
      : undefined;

    const whereConditions = [];
    if (searchCondition) whereConditions.push(searchCondition);
    if (storeTypeFilter) {
      whereConditions.push(
        sql`COALESCE(${trackingBundles.storeType}, 'dropshipping') = ${storeTypeFilter}`,
      );
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const { offset, limit: pageLimit } = getPaginationValues(page, limit);
    const orderBy =
      sortBy === "bundleCode"
        ? sortOrder === "asc" ? asc(sourceBundles.bundleCode) : desc(sourceBundles.bundleCode)
        : sortOrder === "asc" ? asc(sourceBundles.createdAt) : desc(sourceBundles.createdAt);

    const [data, totalResult] = await Promise.all([
      db
        .select({
          sourceBundleId: sourceBundles.id,
          bundleCode: sourceBundles.bundleCode,
          createdAt: sourceBundles.createdAt,
          trackingBundleId: trackingBundles.id,
          name: trackingBundles.name,
          description: trackingBundles.description,
          storeType: trackingBundles.storeType,
          status: trackingBundles.status,
          currentStepId: trackingBundles.currentStepId,
          currentStepLabel: trackingSteps.label,
          updatedAt: trackingBundles.updatedAt,
          supplierId: suppliers.id,
          supplierName: suppliers.storeName,
          supplierCode: suppliers.supplierCode,
        })
        .from(sourceBundles)
        .innerJoin(entries, eq(sourceBundles.entryId, entries.id))
        .leftJoin(suppliers, eq(entries.supplierId, suppliers.id))
        .leftJoin(trackingBundles, eq(trackingBundles.sourceBundleId, sourceBundles.id))
        .leftJoin(trackingSteps, eq(trackingBundles.currentStepId, trackingSteps.id))
        .where(whereClause)
        .limit(pageLimit)
        .offset(offset)
        .orderBy(orderBy),
      db
        .select({ total: count() })
        .from(sourceBundles)
        .innerJoin(entries, eq(sourceBundles.entryId, entries.id))
        .leftJoin(suppliers, eq(entries.supplierId, suppliers.id))
        .leftJoin(trackingBundles, eq(trackingBundles.sourceBundleId, sourceBundles.id))
        .where(whereClause),
    ]);

    const sourceBundleIds = data.map((bundle) => bundle.sourceBundleId);
    const orderCounts = sourceBundleIds.length
      ? await db
          .select({
            sourceBundleId: series.bundleId,
            total: sql<number>`count(distinct ${orderItems.id})::int`,
          })
          .from(orderItems)
          .innerJoin(variants, eq(orderItems.variantId, variants.id))
          .innerJoin(inventoryItems, eq(variants.itemId, inventoryItems.id))
          .innerJoin(series, eq(inventoryItems.seriesId, series.id))
          .where(inArray(series.bundleId, sourceBundleIds))
          .groupBy(series.bundleId)
      : [];

    const countByBundleId = new Map(
      orderCounts.map((row) => [row.sourceBundleId, Number(row.total)]),
    );

    return {
      data: data.map((bundle) => ({
        id: bundle.sourceBundleId,
        trackingBundleId: bundle.trackingBundleId,
        sourceBundleId: bundle.sourceBundleId,
        bundleCode: bundle.bundleCode,
        name: bundle.name ?? bundle.bundleCode,
        description: bundle.description,
        supplierId: bundle.supplierId,
        supplierName: bundle.supplierName,
        supplierCode: bundle.supplierCode,
        storeType: bundle.storeType ?? "dropshipping",
        status: bundle.status ?? "active",
        currentStepId: bundle.currentStepId ?? 3,
        currentStepLabel: bundle.currentStepLabel ?? "Order Received By Manufacturer",
        orderCount: countByBundleId.get(bundle.sourceBundleId) ?? 0,
        createdAt: bundle.createdAt,
        updatedAt: bundle.updatedAt,
      })),
      total: Number(totalResult[0]?.total ?? 0),
      searchableFields,
    };
  }

  async create(payload: CreateTrackingBundleRequest, userId: number) {
    const defaultStep = await db.query.trackingSteps.findFirst({
      where: eq(trackingSteps.stepOrder, 3),
    });

    if (!defaultStep) {
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
        currentStepId: defaultStep.id,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    await db.insert(trackingBundleHistory).values({
      bundleId: created.id,
      stepId: defaultStep.id,
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
    if (step.stepOrder < 3) {
      throw new Error("Tracking updates start at Order Received By Manufacturer");
    }

    const bundle = await this.findById(bundleId);
    if (!bundle) {
      throw new Error("Tracking bundle not found");
    }

    const now = new Date().toISOString();

    await db
      .update(trackingBundles)
      .set({
        currentStepId: payload.stepId,
        updatedAt: now,
        updatedBy: userId,
      })
      .where(eq(trackingBundles.id, bundle.id));

    await db.insert(trackingBundleHistory).values({
      bundleId: bundle.id,
      stepId: payload.stepId,
      notes: payload.notes?.trim() || null,
      attachmentUrl: payload.attachmentUrl?.trim() || null,
      createdAt: now,
      createdBy: userId,
    });

    return this.findById(bundle.id);
  }

  async getBundleOrders(bundleId: number) {
    const bundle = await this.findById(bundleId);
    const sourceBundleId = bundle?.sourceBundleId ?? bundle?.sourceBundle?.id ?? null;
    if (!sourceBundleId) return [];

    const bundleOrderItems = await db
      .select({
        id: orderItems.id,
        orderItemId: orderItems.id,
        orderId: orders.id,
        orderCode: orders.orderCode,
        customerId: orders.customerId,
        customerName: users.fullName,
        productName: orderItems.productName,
        variantCode: orderItems.variantCode,
        quantity: orderItems.quantity,
        totalAmount: orders.totalAmount,
        status: orders.statusId,
        createdAt: orders.createdAt,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .innerJoin(users, eq(customers.userId, users.id))
      .innerJoin(variants, eq(orderItems.variantId, variants.id))
      .innerJoin(inventoryItems, eq(variants.itemId, inventoryItems.id))
      .innerJoin(series, eq(inventoryItems.seriesId, series.id))
      .where(eq(series.bundleId, sourceBundleId))
      .orderBy(desc(orders.createdAt));

    return bundleOrderItems.map((item) => ({
      ...item,
      totalAmount: String(item.totalAmount),
      status: String(item.status ?? "pending"),
    }));
  }

  async getCustomerUsersForBundle(bundleId: number) {
    const bundle = await this.findById(bundleId);
    const sourceBundleId = bundle?.sourceBundleId ?? bundle?.sourceBundle?.id ?? null;
    if (!sourceBundleId) return [];

    const rows = await db
      .select({
        userId: customers.userId,
        orderCode: orders.orderCode,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .innerJoin(variants, eq(orderItems.variantId, variants.id))
      .innerJoin(inventoryItems, eq(variants.itemId, inventoryItems.id))
      .innerJoin(series, eq(inventoryItems.seriesId, series.id))
      .where(eq(series.bundleId, sourceBundleId));

    const byUserId = new Map<number, { userId: number; orderCodes: string[] }>();
    for (const row of rows) {
      if (!row.userId) continue;
      const existing = byUserId.get(row.userId) ?? { userId: row.userId, orderCodes: [] };
      if (!existing.orderCodes.includes(row.orderCode)) {
        existing.orderCodes.push(row.orderCode);
      }
      byUserId.set(row.userId, existing);
    }

    return [...byUserId.values()];
  }

  private async ensureTrackingForSourceBundle(sourceBundleId: number) {
    const sourceBundle = await db.query.bundles.findFirst({
      where: eq(sourceBundles.id, sourceBundleId),
      with: {
        entry: {
          with: {
            supplier: true,
          },
        },
      },
    });

    if (!sourceBundle) return null;

    const existing = await db.query.trackingBundles.findFirst({
      where: eq(trackingBundles.sourceBundleId, sourceBundle.id),
      with: {
        currentStep: true,
        sourceBundle: {
          with: {
            entry: {
              with: {
                supplier: true,
              },
            },
          },
        },
        history: {
          with: {
            step: true,
            createdByUser: true,
          },
          orderBy: [desc(trackingBundleHistory.createdAt)],
        },
      },
    });

    if (existing) return existing;

    const existingByCode = await db.query.trackingBundles.findFirst({
      where: eq(trackingBundles.bundleCode, sourceBundle.bundleCode),
    });

    if (existingByCode && !existingByCode.sourceBundleId) {
      await db
        .update(trackingBundles)
        .set({
          sourceBundleId: sourceBundle.id,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(trackingBundles.id, existingByCode.id));
      return this.findById(sourceBundle.id);
    }

    const steps = await db.query.trackingSteps.findMany({
      where: inArray(trackingSteps.stepOrder, [1, 2, 3]),
      orderBy: [trackingSteps.stepOrder],
    });
    const currentStep = steps.find((step) => step.stepOrder === 3);

    if (!currentStep) {
      throw new Error("Tracking steps are not configured");
    }

    const now = new Date().toISOString();
    const [created] = await db
      .insert(trackingBundles)
      .values({
        sourceBundleId: sourceBundle.id,
        bundleCode: sourceBundle.bundleCode,
        name: sourceBundle.bundleCode,
        description: `Tracking for supplier bundle ${sourceBundle.bundleCode}`,
        storeType: "dropshipping",
        status: "active",
        currentStepId: currentStep.id,
        createdAt: now,
        updatedAt: now,
        createdBy: null,
        updatedBy: null,
      })
      .onConflictDoUpdate({
        target: trackingBundles.sourceBundleId,
        set: {
          updatedAt: now,
        },
      })
      .returning();

    const historyRows = steps.map((step) => ({
      bundleId: created.id,
      stepId: step.id,
      notes:
        step.stepOrder < 3
          ? "Completed by default before supplier tracking starts"
          : "Supplier bundle tracking started",
      createdAt: now,
      createdBy: null,
    }));

    if (historyRows.length) {
      await db.insert(trackingBundleHistory).values(historyRows);
    }

    return this.findById(created.id);
  }
}
