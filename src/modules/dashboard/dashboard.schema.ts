import { z } from "@hono/zod-openapi";

export const dashboardMetricsQuerySchema = z
  .object({
    weeks: z.coerce.number().int().min(4).max(52).optional().default(8),
    from: z.string().date().optional(),
    to: z.string().date().optional(),
  })
  .superRefine((data, ctx) => {
    const hasFrom = Boolean(data.from);
    const hasTo = Boolean(data.to);

    if (hasFrom !== hasTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Both from and to are required for a custom period",
        path: ["from"],
      });
    }

    if (hasFrom && hasTo && data.from! > data.to!) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "From date must be on or before to date",
        path: ["from"],
      });
    }
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

export const platformBreakdownSchema = z.array(
  z.object({
    platform: z.string(),
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
    totalCustomers: z.number(),
    newCustomers: z.number(),
    directOrders: z.number(),
    dropshippingOrders: z.number(),
    averageOrderValue: z.number(),
    ordersDesktop: z.number(),
    ordersMobile: z.number(),
    ordersTablet: z.number(),
    usersDesktop: z.number(),
    usersMobile: z.number(),
    usersTablet: z.number(),
  }),
  weeklyEntriesByWarehouse: weeklyEntriesByWarehouseSchema,
  weeklyOrders: weeklySeriesSchema,
  weeklyPackagesCompleted: weeklySeriesSchema,
  packageStatusBreakdown: packageStatusBreakdownSchema,
  orderPlatformBreakdown: platformBreakdownSchema,
  userPlatformBreakdown: platformBreakdownSchema,
});

export type DashboardMetricsResponse = z.infer<
  typeof dashboardMetricsResponseSchema
>;
