import type {
  AssignOrdersToBundleRequest,
  CreateTrackingBundleRequest,
  UpdateBundleStepRequest,
  UpdateTrackingBundleRequest,
  CreateKiloBillRequest,
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
  orderStatuses,
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
import { OrderStatusTypeIds } from "@/constants/order-statuses.constants";

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
          sourceEntryId: entries.id,
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
        sourceEntryId: bundle.sourceEntryId,
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
    if (step.stepOrder > 6) {
      throw new Error("Bundle tracking stops at Order At The Store");
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

  async undoLastStep(bundleId: number, userId: number) {
    const bundle = await this.findById(bundleId);
    if (!bundle) {
      throw new Error("Tracking bundle not found");
    }

    const history = await db.query.trackingBundleHistory.findMany({
      where: eq(trackingBundleHistory.bundleId, bundle.id),
      with: {
        step: true,
      },
    });

    const manualEntries = history.filter(
      (entry) => (entry.step?.stepOrder ?? 0) > 3,
    );

    if (!manualEntries.length) {
      throw new Error("No manual tracking step to undo");
    }

    const lastEntry = manualEntries.reduce((latest, entry) => (
      (entry.step?.stepOrder ?? 0) > (latest.step?.stepOrder ?? 0) ? entry : latest
    ));

    const remainingHistory = history.filter((entry) => entry.id !== lastEntry.id);
    const previousEntry = remainingHistory.reduce((latest, entry) => (
      (entry.step?.stepOrder ?? 0) > (latest.step?.stepOrder ?? 0) ? entry : latest
    ), remainingHistory[0]);

    if (!previousEntry?.stepId) {
      throw new Error("Unable to determine previous tracking step");
    }

    const now = new Date().toISOString();

    await db
      .delete(trackingBundleHistory)
      .where(eq(trackingBundleHistory.id, lastEntry.id));

    await db
      .update(trackingBundles)
      .set({
        currentStepId: previousEntry.stepId,
        updatedAt: now,
        updatedBy: userId,
      })
      .where(eq(trackingBundles.id, bundle.id));

    return this.findById(bundle.id);
  }

  async listTrackedOrders(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, unknown>;
  }) {
    const { search, page, limit, sortBy, sortOrder, filters } = params;
    const storeTypeFilter = String(filters?.storeType || "dropshipping");
    const searchableFields = ["orderCode", "bundleCode", "customerCode", "customerName"];
    const { limit: pageLimit, offset } = getPaginationValues(page, limit);

    const searchCondition = search
      ? or(
          ilike(orders.orderCode, `%${search}%`),
          ilike(sourceBundles.bundleCode, `%${search}%`),
          ilike(customers.customerCode, `%${search}%`),
          ilike(users.fullName, `%${search}%`),
        )
      : undefined;

    const whereConditions = [
      sql`COALESCE(${trackingBundles.storeType}, 'dropshipping') = ${storeTypeFilter}`,
    ];
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const whereClause = and(...whereConditions);
    const orderBy =
      sortBy === "orderCode"
        ? sortOrder === "asc" ? asc(orders.orderCode) : desc(orders.orderCode)
        : sortOrder === "asc" ? asc(orders.createdAt) : desc(orders.createdAt);

    const rows = await db
      .select({
        orderId: orders.id,
        orderCode: orders.orderCode,
        customerId: orders.customerId,
        customerCode: customers.customerCode,
        customerName: users.fullName,
        bundleCode: sourceBundles.bundleCode,
        sourceBundleId: sourceBundles.id,
        trackingBundleId: trackingBundles.id,
        bundleStepLabel: trackingSteps.label,
        orderStatusId: orders.statusId,
        orderStatusLabel: orderStatuses.name,
        itemCount: sql<number>`count(distinct ${orderItems.id})::int`,
        createdAt: orders.createdAt,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .innerJoin(users, eq(customers.userId, users.id))
      .innerJoin(orderStatuses, eq(orders.statusId, orderStatuses.id))
      .innerJoin(variants, eq(orderItems.variantId, variants.id))
      .innerJoin(inventoryItems, eq(variants.itemId, inventoryItems.id))
      .innerJoin(series, eq(inventoryItems.seriesId, series.id))
      .innerJoin(sourceBundles, eq(series.bundleId, sourceBundles.id))
      .leftJoin(trackingBundles, eq(trackingBundles.sourceBundleId, sourceBundles.id))
      .leftJoin(trackingSteps, eq(trackingBundles.currentStepId, trackingSteps.id))
      .where(whereClause)
      .groupBy(
        orders.id,
        orders.orderCode,
        orders.customerId,
        customers.customerCode,
        users.fullName,
        sourceBundles.bundleCode,
        sourceBundles.id,
        trackingBundles.id,
        trackingSteps.label,
        orders.statusId,
        orderStatuses.name,
        orders.createdAt,
      )
      .orderBy(orderBy)
      .limit(pageLimit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: sql<number>`count(distinct ${orders.id})::int` })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .innerJoin(users, eq(customers.userId, users.id))
      .innerJoin(variants, eq(orderItems.variantId, variants.id))
      .innerJoin(inventoryItems, eq(variants.itemId, inventoryItems.id))
      .innerJoin(series, eq(inventoryItems.seriesId, series.id))
      .innerJoin(sourceBundles, eq(series.bundleId, sourceBundles.id))
      .leftJoin(trackingBundles, eq(trackingBundles.sourceBundleId, sourceBundles.id))
      .where(whereClause);

    return {
      data: rows.map((row) => ({
        ...row,
        orderStepLabel: this.resolveOrderTrackingStepLabel(row.orderStatusId, row.orderStatusLabel),
        bundleStepLabel: row.bundleStepLabel ?? "Order Received By Manufacturer",
        itemCount: Number(row.itemCount) || 0,
        createdAt: row.createdAt ?? new Date().toISOString(),
      })),
      total: Number(total) || 0,
      searchableFields,
    };
  }

  private resolveOrderTrackingStepLabel(statusId: number, statusLabel: string) {
    const ORDER_STEP_LABELS: Record<number, string> = {
      [OrderStatusTypeIds.PAYMENT_OF_KILO]: "7. Payment Of Kilo",
      [OrderStatusTypeIds.PACKAGING]: "8. Packaging",
      [OrderStatusTypeIds.READY_FOR_FULFILLMENT]: "8. Packaging",
      [OrderStatusTypeIds.PROCESSING]: "8. Packaging",
      [OrderStatusTypeIds.PAYMENT_FOR_DELIVERIES]: "9. Payment For Deliveries",
      [OrderStatusTypeIds.SHIPPED]: "10. Deliveries",
      [OrderStatusTypeIds.DELIVERED]: "10. Deliveries",
    };

    return ORDER_STEP_LABELS[statusId] ?? `Awaiting order leg · ${statusLabel}`;
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

  async getCustomerUsersForOrder(orderId: number) {
    const rows = await db
      .select({
        userId: customers.userId,
        orderCode: orders.orderCode,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.id, orderId));

    return rows.filter((row) => Boolean(row.userId));
  }

  async createKiloBill(
    bundleId: number,
    payload: CreateKiloBillRequest,
    userId: number,
  ) {
    const bundle = await this.findById(bundleId);
    if (!bundle) {
      throw new Error("Tracking bundle not found");
    }
    if ((bundle.currentStep?.stepOrder ?? 0) < 6) {
      throw new Error("Kilo bills can only be created after the bundle is at the store");
    }

    const sourceBundleId = bundle.sourceBundleId ?? bundle.sourceBundle?.id ?? null;
    if (!sourceBundleId) {
      throw new Error("Tracking bundle is not linked to a supplier order bundle");
    }

    const linkedOrder = await db
      .select({ orderId: orders.id })
      .from(orderItems)
      .innerJoin(variants, eq(orderItems.variantId, variants.id))
      .innerJoin(inventoryItems, eq(variants.itemId, inventoryItems.id))
      .innerJoin(series, eq(inventoryItems.seriesId, series.id))
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(eq(series.bundleId, sourceBundleId), eq(orders.id, payload.orderId)))
      .limit(1);

    if (!linkedOrder.length) {
      throw new Error("Order is not linked to this supplier order bundle");
    }

    const amount = (payload.totalKg * payload.pricePerKg).toFixed(2);
    const now = new Date().toISOString();

    const rows = await db.execute(sql`
      INSERT INTO kilo_bills (
        tracking_bundle_id,
        order_id,
        total_kg,
        price_per_kg,
        amount,
        notes,
        status,
        created_at,
        updated_at,
        created_by,
        updated_by
      )
      VALUES (
        ${bundle.id},
        ${payload.orderId},
        ${payload.totalKg.toFixed(2)},
        ${payload.pricePerKg.toFixed(2)},
        ${amount},
        ${payload.notes?.trim() || null},
        'pending',
        ${now},
        ${now},
        ${userId},
        ${userId}
      )
      ON CONFLICT (tracking_bundle_id, order_id)
      DO UPDATE SET
        total_kg = EXCLUDED.total_kg,
        price_per_kg = EXCLUDED.price_per_kg,
        amount = EXCLUDED.amount,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by
      RETURNING
        id,
        tracking_bundle_id as "trackingBundleId",
        order_id as "orderId",
        total_kg as "totalKg",
        price_per_kg as "pricePerKg",
        amount,
        notes,
        status,
        created_at as "createdAt"
    `);

    return rows[0] as {
      id: number;
      trackingBundleId: number;
      orderId: number;
      totalKg: string;
      pricePerKg: string;
      amount: string;
      notes: string | null;
      status: string;
      createdAt: string;
    };
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
