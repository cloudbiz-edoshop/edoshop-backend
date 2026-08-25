import type {
  AssignOrdersToBundleRequest,
  CreateTrackingBundleRequest,
  UpdateBundleStepRequest,
  UpdateTrackingBundleRequest,
  CreateKiloBillRequest,
} from "./tracking-bundles.schema";

import { and, asc, count, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";
import db from "@/db";
import {
  BUNDLE_MANUAL_STEP_MAX,
  BUNDLE_MANUAL_STEP_MIN,
  BUNDLE_ORDERS_VISIBLE_FROM_STEP_ORDER,
  BUNDLE_TO_ORDER_STEP_CODE,
} from "@/constants/bundle-tracking.constants";
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
import {
  buildDropshippingOrderLegAdminTrackingSteps,
  getDropshippingOrderLegStepDefinitions,
  getDropshippingOrderLegTargetStatusId,
  resolveDropshippingOrderLegStepLabel,
} from "@/modules/orders/order-tracking.util";

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
          orderBy: [asc(trackingBundleHistory.createdAt)],
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
          orderBy: [asc(trackingBundleHistory.createdAt)],
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
    const searchableFields = ["bundleCode", "orderCode", "supplierName", "storeType", "status"];
    const parsedFilters = filters ?? {};
    const storeTypeFilter = String(parsedFilters.storeType || "");

    const searchCondition = search
      ? or(
          ilike(sourceBundles.bundleCode, `%${search}%`),
          ilike(suppliers.storeName, `%${search}%`),
          ilike(suppliers.supplierCode, `%${search}%`),
          sql`exists (
            select 1
            from ${orderItems}
            inner join ${orders} on ${orders.id} = ${orderItems.orderId}
            inner join ${variants} on ${variants.id} = ${orderItems.variantId}
            inner join ${inventoryItems} on ${inventoryItems.id} = ${variants.itemId}
            inner join ${series} on ${series.id} = ${inventoryItems.seriesId}
            where ${series.bundleId} = ${sourceBundles.id}
              and ${orders.orderCode} ilike ${`%${search}%`}
          )`,
        )
      : undefined;

    const whereConditions = [];
    if (searchCondition) whereConditions.push(searchCondition);
    if (storeTypeFilter) {
      whereConditions.push(
        sql`COALESCE(${trackingBundles.storeType}, 'dropshipping') = ${storeTypeFilter}`,
      );
    }
    if (parsedFilters.minBundleStepOrder) {
      whereConditions.push(
        gte(trackingSteps.stepOrder, Number(parsedFilters.minBundleStepOrder)),
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
          currentStepOrder: trackingSteps.stepOrder,
          currentStepCode: trackingSteps.code,
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
        .leftJoin(trackingSteps, eq(trackingBundles.currentStepId, trackingSteps.id))
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

    const linkedOrderRows = sourceBundleIds.length
      ? await db
          .select({
            sourceBundleId: series.bundleId,
            orderCode: orders.orderCode,
          })
          .from(orderItems)
          .innerJoin(orders, eq(orderItems.orderId, orders.id))
          .innerJoin(variants, eq(orderItems.variantId, variants.id))
          .innerJoin(inventoryItems, eq(variants.itemId, inventoryItems.id))
          .innerJoin(series, eq(inventoryItems.seriesId, series.id))
          .where(inArray(series.bundleId, sourceBundleIds))
      : [];

    const trackingBundleIds = data
      .map((bundle) => bundle.trackingBundleId)
      .filter((id): id is number => Boolean(id));

    const assignedOrderRows = trackingBundleIds.length
      ? await db
          .select({
            trackingBundleId: trackingBundleItems.bundleId,
            sourceBundleId: trackingBundles.sourceBundleId,
            orderCode: orders.orderCode,
          })
          .from(trackingBundleItems)
          .innerJoin(trackingBundles, eq(trackingBundleItems.bundleId, trackingBundles.id))
          .innerJoin(orders, eq(trackingBundleItems.orderId, orders.id))
          .where(inArray(trackingBundleItems.bundleId, trackingBundleIds))
      : [];

    const orderCodesByBundleId = new Map<number, string[]>();
    for (const row of linkedOrderRows) {
      const existing = orderCodesByBundleId.get(row.sourceBundleId) ?? [];
      if (!existing.includes(row.orderCode)) {
        existing.push(row.orderCode);
      }
      orderCodesByBundleId.set(row.sourceBundleId, existing);
    }
    for (const row of assignedOrderRows) {
      if (!row.sourceBundleId) continue;
      const existing = orderCodesByBundleId.get(row.sourceBundleId) ?? [];
      if (!existing.includes(row.orderCode)) {
        existing.push(row.orderCode);
      }
      orderCodesByBundleId.set(row.sourceBundleId, existing);
    }

    return {
      data: data.map((bundle) => ({
        id: bundle.sourceBundleId,
        sourceEntryId: bundle.sourceEntryId,
        trackingBundleId: bundle.trackingBundleId,
        sourceBundleId: bundle.sourceBundleId,
        bundleCode: bundle.bundleCode,
        orderCodes: orderCodesByBundleId.get(bundle.sourceBundleId) ?? [],
        name: bundle.name ?? bundle.bundleCode,
        description: bundle.description,
        supplierId: bundle.supplierId,
        supplierName: bundle.supplierName,
        supplierCode: bundle.supplierCode,
        storeType: bundle.storeType ?? "dropshipping",
        status: bundle.status ?? "active",
        currentStepId: bundle.currentStepId ?? 3,
        currentStepLabel: bundle.currentStepLabel ?? "Order Received By Manufacturer",
        currentStepOrder: bundle.currentStepOrder ?? 3,
        currentStepCode: bundle.currentStepCode ?? null,
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
    if (step.stepOrder < BUNDLE_MANUAL_STEP_MIN) {
      throw new Error("Tracking updates start at Order Received By Manufacturer");
    }
    if (step.stepOrder > BUNDLE_MANUAL_STEP_MAX) {
      throw new Error("Bundle tracking stops at Bundle to Order");
    }

    const bundle = await this.findById(bundleId);
    if (!bundle) {
      throw new Error("Tracking bundle not found");
    }

    const currentStepOrder = bundle.currentStep?.stepOrder ?? BUNDLE_MANUAL_STEP_MIN;

    if (step.stepOrder === currentStepOrder) {
      throw new Error("Bundle is already on this step");
    }

    const isBackward = step.stepOrder < currentStepOrder;

    if (isBackward) {
      if (!payload.notes?.trim()) {
        throw new Error("A reason is required when moving to a previous step");
      }
    } else if (step.stepOrder !== currentStepOrder + 1) {
      throw new Error(
        `Complete steps one at a time. Next allowed step is ${currentStepOrder + 1}.`,
      );
    }

    const now = new Date().toISOString();
    const trimmedNotes = payload.notes?.trim() || null;
    const historyNotes = isBackward && trimmedNotes
      ? `Reverted from step ${currentStepOrder} to step ${step.stepOrder}: ${trimmedNotes}`
      : trimmedNotes;

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
      notes: historyNotes,
      attachmentUrl: payload.attachmentUrl?.trim() || null,
      createdAt: now,
      createdBy: userId,
    });

    if (step.code === BUNDLE_TO_ORDER_STEP_CODE) {
      await this.syncBundleOrdersToTrackingItems(bundle.id, userId);
    }

    return this.findById(bundle.id);
  }

  async backfillTrackingBundleItems() {
    await db.execute(sql`
      INSERT INTO tracking_bundle_items (bundle_id, order_id, created_at)
      SELECT DISTINCT
        tb.id,
        o.id,
        NOW()
      FROM tracking_bundles tb
      INNER JOIN tracking_steps ts ON ts.id = tb.current_step_id
      INNER JOIN bundles sb ON sb.id = tb.source_bundle_id
      INNER JOIN series s ON s.bundle_id = sb.id
      INNER JOIN items i ON i.series_id = s.id
      INNER JOIN variants v ON v.item_id = i.id
      INNER JOIN order_items oi ON oi.variant_id = v.id
      INNER JOIN orders o ON o.id = oi.order_id
      WHERE ts.step_order >= ${BUNDLE_ORDERS_VISIBLE_FROM_STEP_ORDER}
      ON CONFLICT DO NOTHING
    `);
  }

  async syncBundleOrdersToTrackingItems(bundleId: number, userId: number | null) {
    const bundle = await this.findById(bundleId);
    const sourceBundleId = bundle?.sourceBundleId ?? bundle?.sourceBundle?.id ?? null;
    if (!sourceBundleId) return;

    const linkedOrders = await db
      .selectDistinct({ orderId: orders.id })
      .from(orderItems)
      .innerJoin(variants, eq(orderItems.variantId, variants.id))
      .innerJoin(inventoryItems, eq(variants.itemId, inventoryItems.id))
      .innerJoin(series, eq(inventoryItems.seriesId, series.id))
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(eq(series.bundleId, sourceBundleId));

    const now = new Date().toISOString();
    for (const row of linkedOrders) {
      const existing = await db.query.trackingBundleItems.findFirst({
        where: and(
          eq(trackingBundleItems.bundleId, bundleId),
          eq(trackingBundleItems.orderId, row.orderId),
        ),
      });

      if (existing) continue;

      await db.insert(trackingBundleItems).values({
        bundleId,
        orderId: row.orderId,
        createdAt: now,
        createdBy: userId,
      });
    }
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
    await this.backfillTrackingBundleItems();

    const { search, page, limit, sortBy, sortOrder, filters } = params;
    const storeTypeFilter = String(filters?.storeType || "dropshipping");
    const minStepRaw = filters?.minBundleStepOrder;
    const minStep = minStepRaw !== undefined && minStepRaw !== null && minStepRaw !== ""
      ? Number(minStepRaw)
      : BUNDLE_ORDERS_VISIBLE_FROM_STEP_ORDER;
    const searchableFields = ["orderCode", "bundleCode", "customerCode", "customerName"];
    const { limit: pageLimit, offset } = getPaginationValues(page, limit);

    const searchCondition = search
      ? or(
          ilike(orders.orderCode, `%${search}%`),
          ilike(customers.customerCode, `%${search}%`),
          ilike(users.fullName, `%${search}%`),
          sql`exists (
            select 1
            from ${trackingBundleItems} tbi
            inner join ${trackingBundles} tb on tb.id = tbi.bundle_id
            inner join ${sourceBundles} sb on sb.id = tb.source_bundle_id
            inner join ${trackingSteps} ts on ts.id = tb.current_step_id
            where tbi.order_id = ${orders.id}
              and sb.bundle_code ilike ${`%${search}%`}
              and ts.step_order >= ${minStep}
          )`,
        )
      : undefined;

    const stepFilterSql = !Number.isNaN(minStep)
      ? sql`and ts.step_order >= ${minStep}`
      : sql``;

    const sentToOrderTracking = sql`exists (
      select 1
      from ${trackingBundleItems} tbi
      inner join ${trackingBundles} tb on tb.id = tbi.bundle_id
      inner join ${trackingSteps} ts on ts.id = tb.current_step_id
      where tbi.order_id = ${orders.id}
        and COALESCE(tb.store_type, 'dropshipping') = ${storeTypeFilter}
        ${stepFilterSql}
    )`;

    const whereConditions = [sentToOrderTracking];
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const whereClause = and(...whereConditions);
    const orderBy =
      sortBy === "orderCode"
        ? sortOrder === "asc" ? asc(orders.orderCode) : desc(orders.orderCode)
        : sortOrder === "asc" ? asc(orders.createdAt) : desc(orders.createdAt);

    const bundleCodeSql = sql<string>`(
      select sb.bundle_code
      from ${trackingBundleItems} tbi
      inner join ${trackingBundles} tb on tb.id = tbi.bundle_id
      inner join ${sourceBundles} sb on sb.id = tb.source_bundle_id
      inner join ${trackingSteps} ts on ts.id = tb.current_step_id
      where tbi.order_id = ${orders.id}
        and ts.step_order >= ${minStep}
      limit 1
    )`;

    const sourceBundleIdSql = sql<number>`(
      select tb.source_bundle_id
      from ${trackingBundleItems} tbi
      inner join ${trackingBundles} tb on tb.id = tbi.bundle_id
      inner join ${trackingSteps} ts on ts.id = tb.current_step_id
      where tbi.order_id = ${orders.id}
        and ts.step_order >= ${minStep}
      limit 1
    )`;

    const trackingBundleIdSql = sql<number>`(
      select tb.id
      from ${trackingBundleItems} tbi
      inner join ${trackingBundles} tb on tb.id = tbi.bundle_id
      inner join ${trackingSteps} ts on ts.id = tb.current_step_id
      where tbi.order_id = ${orders.id}
        and ts.step_order >= ${minStep}
      limit 1
    )`;

    const bundleStepLabelSql = sql<string>`COALESCE((
      select ts.label
      from ${trackingBundleItems} tbi
      inner join ${trackingBundles} tb on tb.id = tbi.bundle_id
      inner join ${trackingSteps} ts on ts.id = tb.current_step_id
      where tbi.order_id = ${orders.id}
        and ts.step_order >= ${minStep}
      limit 1
    ), 'Bundle to Order')`;

    const rows = await db
      .select({
        orderId: orders.id,
        orderCode: orders.orderCode,
        customerId: orders.customerId,
        customerCode: customers.customerCode,
        customerName: users.fullName,
        bundleCode: bundleCodeSql,
        sourceBundleId: sourceBundleIdSql,
        trackingBundleId: trackingBundleIdSql,
        bundleStepLabel: bundleStepLabelSql,
        orderStatusId: orders.statusId,
        orderStatusLabel: orderStatuses.name,
        itemCount: sql<number>`count(distinct ${orderItems.id})::int`,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .innerJoin(users, eq(customers.userId, users.id))
      .innerJoin(orderStatuses, eq(orders.statusId, orderStatuses.id))
      .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(whereClause)
      .groupBy(
        orders.id,
        orders.orderCode,
        orders.customerId,
        customers.customerCode,
        users.fullName,
        orders.statusId,
        orderStatuses.name,
        orders.createdAt,
      )
      .orderBy(orderBy)
      .limit(pageLimit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: sql<number>`count(distinct ${orders.id})::int` })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .innerJoin(users, eq(customers.userId, users.id))
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
    return resolveDropshippingOrderLegStepLabel(statusId, statusLabel);
  }

  async getTrackedOrderDetail(orderId: number) {
    const [assignedRow] = await db
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
        updatedAt: orders.updatedAt,
        orderTypeId: orders.orderTypeId,
      })
      .from(trackingBundleItems)
      .innerJoin(trackingBundles, eq(trackingBundleItems.bundleId, trackingBundles.id))
      .innerJoin(trackingSteps, eq(trackingBundles.currentStepId, trackingSteps.id))
      .innerJoin(orders, eq(trackingBundleItems.orderId, orders.id))
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .innerJoin(users, eq(customers.userId, users.id))
      .innerJoin(orderStatuses, eq(orders.statusId, orderStatuses.id))
      .leftJoin(sourceBundles, eq(trackingBundles.sourceBundleId, sourceBundles.id))
      .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(eq(orders.id, orderId))
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
        orders.updatedAt,
        orders.orderTypeId,
      )
      .limit(1);

    let inventoryRow: typeof assignedRow | undefined;
    if (!assignedRow) {
      [inventoryRow] = await db
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
            updatedAt: orders.updatedAt,
            orderTypeId: orders.orderTypeId,
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
          .where(eq(orders.id, orderId))
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
            orders.updatedAt,
            orders.orderTypeId,
          )
          .limit(1);
    }

    const row = assignedRow ?? inventoryRow;

    if (!row) {
      return null;
    }

    const steps = buildDropshippingOrderLegAdminTrackingSteps({
      statusId: row.orderStatusId,
      createdAt: row.createdAt ?? new Date().toISOString(),
      updatedAt: row.updatedAt,
    });

    return {
      orderId: row.orderId,
      orderCode: row.orderCode,
      customerId: row.customerId,
      customerCode: row.customerCode,
      customerName: row.customerName,
      bundleCode: row.bundleCode,
      sourceBundleId: row.sourceBundleId,
      trackingBundleId: row.trackingBundleId,
      bundleStepLabel: row.bundleStepLabel ?? "Order Received By Manufacturer",
      orderStatusId: row.orderStatusId,
      orderStatusLabel: row.orderStatusLabel,
      orderStepLabel: this.resolveOrderTrackingStepLabel(
        row.orderStatusId,
        row.orderStatusLabel,
      ),
      currentStepLabel: this.resolveOrderTrackingStepLabel(
        row.orderStatusId,
        row.orderStatusLabel,
      ),
      itemCount: Number(row.itemCount) || 0,
      createdAt: row.createdAt ?? new Date().toISOString(),
      updatedAt: row.updatedAt,
      steps,
      stepDefinitions: getDropshippingOrderLegStepDefinitions().map((step) => ({
        stepOrder: step.stepOrder,
        label: `${step.stepOrder}. ${step.label}`,
        description: step.description,
      })),
    };
  }

  async updateTrackedOrderStep(
    orderId: number,
    stepOrder: number,
    userId: number,
    notes?: string,
  ) {
    const existing = await this.getTrackedOrderDetail(orderId);
    if (!existing) {
      throw new Error("Tracked order not found");
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      throw new Error("Tracked order not found");
    }

    const targetStatusId = getDropshippingOrderLegTargetStatusId(stepOrder);
    if (!targetStatusId) {
      throw new Error("Invalid order tracking step");
    }

    const now = new Date().toISOString();
    const noteEntry = notes?.trim()
      ? `\n[Tracking ${now}] ${notes.trim()}`
      : "";

    await db
      .update(orders)
      .set({
        statusId: targetStatusId,
        updatedAt: now,
        updatedBy: userId,
        notes: order.notes
          ? `${order.notes}${noteEntry}`
          : noteEntry.trim() || order.notes,
      })
      .where(eq(orders.id, orderId));

    const detail = await this.getTrackedOrderDetail(orderId);
    if (!detail) {
      throw new Error("Tracked order not found");
    }

    return detail;
  }

  async getBundleOrders(bundleId: number) {
    const bundle = await this.findById(bundleId);
    const sourceBundleId = bundle?.sourceBundleId ?? bundle?.sourceBundle?.id ?? null;
    if (!sourceBundleId) return [];

    if ((bundle?.currentStep?.stepOrder ?? 0) < BUNDLE_ORDERS_VISIBLE_FROM_STEP_ORDER) {
      return [];
    }

    const assignedOrders = await db
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
      .from(trackingBundleItems)
      .innerJoin(orders, eq(trackingBundleItems.orderId, orders.id))
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .innerJoin(users, eq(customers.userId, users.id))
      .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(eq(trackingBundleItems.bundleId, bundle.id))
      .orderBy(desc(orders.createdAt));

    const inventoryOrders = await db
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

    const merged = new Map<string, typeof assignedOrders[number]>();
    for (const item of [...assignedOrders, ...inventoryOrders]) {
      const key = `${item.orderId}-${item.orderItemId ?? "none"}`;
      if (!merged.has(key)) {
        merged.set(key, item);
      }
    }

    return [...merged.values()].map((item) => ({
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
    if ((bundle.currentStep?.stepOrder ?? 0) < BUNDLE_ORDERS_VISIBLE_FROM_STEP_ORDER) {
      throw new Error("Kilo bills can only be created after the bundle is sent to order tracking");
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
          orderBy: [asc(trackingBundleHistory.createdAt)],
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
