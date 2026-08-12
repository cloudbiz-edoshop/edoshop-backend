import { z } from "@hono/zod-openapi";

export const dashboardMetricsQuerySchema = z.object({
  weeks: z.coerce.number().int().min(4).max(12).optional().default(8),
});

export const weeklySeriesSchema = z.object({
  weeks: z.array(z.string()),
  counts: z.array(z.number()),
});

export const weeklyEntriesByWarehouseSchema = z.object({
  weeks: z.array(z.string()),
  warehouses: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      counts: z.array(z.number()),
    }),
  ),
});

export const packageStatusBreakdownSchema = z.array(
  z.object({
    status: z.string(),
    count: z.number(),
  }),
);

export const dashboardMetricsResponseSchema = z.object({
  summary: z.object({
    totalEntries: z.number(),
    totalOrders: z.number(),
    packagesCompleted: z.number(),
    packagesInProgress: z.number(),
    activeWarehouses: z.number(),
  }),
  weeklyEntriesByWarehouse: weeklyEntriesByWarehouseSchema,
  weeklyOrders: weeklySeriesSchema,
  weeklyPackagesCompleted: weeklySeriesSchema,
  packageStatusBreakdown: packageStatusBreakdownSchema,
});

export type DashboardMetricsResponse = z.infer<
  typeof dashboardMetricsResponseSchema
>;
