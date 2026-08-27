import { and, count, eq, gte, inArray, lt, sql } from "drizzle-orm";

import { OrderTypeIds } from "@/constants/order-types.constants";
import { PackageStatusIds } from "@/constants/package-statuses.constants";
import db from "@/db";
import { customers, entries, orders, packages, users, warehouses } from "@/db/models";
import { formatClientPlatformLabel } from "@/lib/client-platform";

type WeekBucket = {
  key: string;
  label: string;
  start: string;
};

const COMPLETED_PACKAGE_STATUSES = [
  PackageStatusIds.DELIVERED,
  PackageStatusIds.SHIPPED,
];

const IN_PROGRESS_PACKAGE_STATUSES = [
  PackageStatusIds.CREATED,
  PackageStatusIds.PACKED,
  PackageStatusIds.PENDING,
  PackageStatusIds.READY_TO_DISPATCH,
  PackageStatusIds.DISPATCHED,
];

function formatLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMondayOfWeek(date: Date) {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);

  const day = monday.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + mondayOffset);

  return monday;
}

function buildWeekBucket(start: Date): WeekBucket {
  const key = formatLocalDateKey(start);
  const label = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return { key, label, start: key };
}

function buildWeekBuckets(weekCount: number): WeekBucket[] {
  const currentWeekStart = getMondayOfWeek(new Date());
  const buckets: WeekBucket[] = [];

  for (let index = weekCount - 1; index >= 0; index -= 1) {
    const start = new Date(currentWeekStart);
    start.setDate(currentWeekStart.getDate() - index * 7);
    buckets.push(buildWeekBucket(start));
  }

  return buckets;
}

function buildWeekBucketsFromRange(from: string, to: string): WeekBucket[] {
  const startMonday = getMondayOfWeek(new Date(`${from}T00:00:00`));
  const endMonday = getMondayOfWeek(new Date(`${to}T00:00:00`));

  if (startMonday > endMonday) {
    return [];
  }

  const buckets: WeekBucket[] = [];
  const cursor = new Date(startMonday);

  while (cursor <= endMonday) {
    buckets.push(buildWeekBucket(cursor));
    cursor.setDate(cursor.getDate() + 7);

    if (buckets.length > 52) {
      break;
    }
  }

  return buckets;
}

function resolveWeekBuckets(params: {
  weeks?: number;
  from?: string;
  to?: string;
}) {
  if (params.from && params.to) {
    return buildWeekBucketsFromRange(params.from, params.to);
  }

  return buildWeekBuckets(params.weeks ?? 8);
}

function getPeriodBounds(buckets: WeekBucket[]) {
  const sinceDate = buckets[0]?.start;
  const lastWeekStart = buckets[buckets.length - 1]?.start;

  if (!lastWeekStart) {
    return { sinceDate, untilDate: undefined as string | undefined };
  }

  const until = new Date(`${lastWeekStart}T00:00:00`);
  until.setDate(until.getDate() + 7);
  const untilDate = formatLocalDateKey(until);

  return { sinceDate, untilDate };
}

function mapWeeklyCounts(
  rows: { weekStart: string; count: number }[],
  buckets: WeekBucket[],
) {
  const countByWeek = new Map(
    rows.map((row) => [String(row.weekStart).slice(0, 10), row.count]),
  );

  return buckets.map((bucket) => countByWeek.get(bucket.key) ?? 0);
}

function mapPlatformBreakdown(
  rows: { platform: string | null; count: number }[],
) {
  const totals = new Map<string, number>();

  for (const row of rows) {
    const label = formatClientPlatformLabel(row.platform ?? "unknown");
    totals.set(label, (totals.get(label) ?? 0) + row.count);
  }

  return Array.from(totals.entries())
    .map(([platform, countValue]) => ({ platform, count: countValue }))
    .sort((left, right) => right.count - left.count);
}

export class DashboardRepository {
  async getMetrics(params: { weeks?: number; from?: string; to?: string }) {
    const weekBuckets = resolveWeekBuckets(params);
    const { sinceDate, untilDate } = getPeriodBounds(weekBuckets);

    const warehouseList = await db
      .select({ id: warehouses.id, name: warehouses.name })
      .from(warehouses)
      .where(and(eq(warehouses.isDeleted, false), eq(warehouses.isActive, true)))
      .orderBy(warehouses.name);

    const [
      totalEntriesResult,
      totalOrdersResult,
      packagesCompletedResult,
      packagesInProgressResult,
      totalCustomersResult,
      newCustomersResult,
      directOrdersResult,
      dropshippingOrdersResult,
      averageOrderValueResult,
      orderPlatformRows,
      userPlatformRows,
      entriesWeeklyRows,
      ordersWeeklyRows,
      packagesWeeklyRows,
      packageStatusRows,
    ] = await Promise.all([
      db
        .select({ value: count() })
        .from(entries)
        .where(eq(entries.isDeleted, false)),
      db
        .select({ value: count() })
        .from(orders)
        .where(eq(orders.isDeleted, false)),
      db
        .select({ value: count() })
        .from(packages)
        .where(inArray(packages.packageStatusId, COMPLETED_PACKAGE_STATUSES)),
      db
        .select({ value: count() })
        .from(packages)
        .where(inArray(packages.packageStatusId, IN_PROGRESS_PACKAGE_STATUSES)),
      db
        .select({ value: count() })
        .from(customers)
        .where(eq(customers.isDeleted, false)),
      db
        .select({ value: count() })
        .from(users)
        .innerJoin(customers, eq(customers.userId, users.id))
        .where(
          and(
            eq(customers.isDeleted, false),
            eq(users.isDeleted, false),
            gte(users.createdAt, sql`now() - interval '30 days'`),
          ),
        ),
      db
        .select({ value: count() })
        .from(orders)
        .where(
          and(
            eq(orders.isDeleted, false),
            eq(orders.orderTypeId, OrderTypeIds.DIRECT_ORDER),
          ),
        ),
      db
        .select({ value: count() })
        .from(orders)
        .where(
          and(
            eq(orders.isDeleted, false),
            eq(orders.orderTypeId, OrderTypeIds.DROPSHIPPING),
          ),
        ),
      db
        .select({
          value: sql<number>`coalesce(avg(${orders.totalAmount}::numeric), 0)::float`,
        })
        .from(orders)
        .where(eq(orders.isDeleted, false)),
      db
        .select({
          platform: orders.clientPlatform,
          count: sql<number>`count(*)::int`,
        })
        .from(orders)
        .where(eq(orders.isDeleted, false))
        .groupBy(orders.clientPlatform),
      db
        .select({
          platform: users.registrationPlatform,
          count: sql<number>`count(*)::int`,
        })
        .from(users)
        .innerJoin(customers, eq(customers.userId, users.id))
        .where(and(eq(customers.isDeleted, false), eq(users.isDeleted, false)))
        .groupBy(users.registrationPlatform),
      db
        .select({
          weekStart: sql<string>`date_trunc('week', ${entries.date}::timestamp)::date`,
          warehouseId: entries.warehouseId,
          count: sql<number>`count(*)::int`,
        })
        .from(entries)
        .where(
          and(
            eq(entries.isDeleted, false),
            sinceDate ? gte(entries.date, sinceDate) : undefined,
            untilDate ? lt(entries.date, untilDate) : undefined,
          ),
        )
        .groupBy(
          sql`date_trunc('week', ${entries.date}::timestamp)::date`,
          entries.warehouseId,
        ),
      db
        .select({
          weekStart: sql<string>`date_trunc('week', ${orders.createdAt}::timestamp)::date`,
          count: sql<number>`count(*)::int`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.isDeleted, false),
            sinceDate
              ? gte(orders.createdAt, `${sinceDate}T00:00:00.000Z`)
              : undefined,
            untilDate
              ? lt(orders.createdAt, `${untilDate}T00:00:00.000Z`)
              : undefined,
          ),
        )
        .groupBy(sql`date_trunc('week', ${orders.createdAt}::timestamp)::date`),
      db
        .select({
          weekStart: sql<string>`date_trunc('week', ${packages.updatedAt}::timestamp)::date`,
          count: sql<number>`count(*)::int`,
        })
        .from(packages)
        .where(
          and(
            inArray(packages.packageStatusId, COMPLETED_PACKAGE_STATUSES),
            sinceDate
              ? gte(packages.updatedAt, `${sinceDate}T00:00:00.000Z`)
              : undefined,
            untilDate
              ? lt(packages.updatedAt, `${untilDate}T00:00:00.000Z`)
              : undefined,
          ),
        )
        .groupBy(sql`date_trunc('week', ${packages.updatedAt}::timestamp)::date`),
      db
        .select({
          statusId: packages.packageStatusId,
          count: sql<number>`count(*)::int`,
        })
        .from(packages)
        .groupBy(packages.packageStatusId),
    ]);

    const entriesByWarehouseWeek = new Map<string, number>();
    for (const row of entriesWeeklyRows) {
      const key = `${String(row.weekStart).slice(0, 10)}:${row.warehouseId}`;
      entriesByWarehouseWeek.set(key, row.count);
    }

    const weekLabels = weekBuckets.map((bucket) => bucket.label);

    const orderPlatformBreakdown = mapPlatformBreakdown(orderPlatformRows);
    const userPlatformBreakdown = mapPlatformBreakdown(userPlatformRows);

    const countByPlatform = (rows: { platform: string; count: number }[], label: string) =>
      rows.find((row) => row.platform === label)?.count ?? 0;

    return {
      summary: {
        totalEntries: totalEntriesResult[0]?.value ?? 0,
        totalOrders: totalOrdersResult[0]?.value ?? 0,
        packagesCompleted: packagesCompletedResult[0]?.value ?? 0,
        packagesInProgress: packagesInProgressResult[0]?.value ?? 0,
        activeWarehouses: warehouseList.length,
        totalCustomers: totalCustomersResult[0]?.value ?? 0,
        newCustomers: newCustomersResult[0]?.value ?? 0,
        directOrders: directOrdersResult[0]?.value ?? 0,
        dropshippingOrders: dropshippingOrdersResult[0]?.value ?? 0,
        averageOrderValue: Number(averageOrderValueResult[0]?.value ?? 0),
        ordersDesktop: countByPlatform(orderPlatformBreakdown, "Desktop"),
        ordersMobile: countByPlatform(orderPlatformBreakdown, "Mobile"),
        ordersTablet: countByPlatform(orderPlatformBreakdown, "Tablet"),
        usersDesktop: countByPlatform(userPlatformBreakdown, "Desktop"),
        usersMobile: countByPlatform(userPlatformBreakdown, "Mobile"),
        usersTablet: countByPlatform(userPlatformBreakdown, "Tablet"),
      },
      weeklyEntriesByWarehouse: {
        weeks: weekLabels,
        warehouses: warehouseList.map((warehouse) => ({
          id: warehouse.id,
          name: warehouse.name,
          counts: weekBuckets.map((bucket) =>
            entriesByWarehouseWeek.get(`${bucket.key}:${warehouse.id}`) ?? 0,
          ),
        })),
      },
      weeklyOrders: {
        weeks: weekLabels,
        counts: mapWeeklyCounts(ordersWeeklyRows, weekBuckets),
      },
      weeklyPackagesCompleted: {
        weeks: weekLabels,
        counts: mapWeeklyCounts(packagesWeeklyRows, weekBuckets),
      },
      packageStatusBreakdown: packageStatusRows.map((row) => ({
        status: String(row.statusId),
        count: row.count,
      })),
      orderPlatformBreakdown,
      userPlatformBreakdown,
    };
  }
}
