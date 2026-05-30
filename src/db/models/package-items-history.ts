import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import orderItems from "./order-items";
import { packageItems } from "./package-items";
import packages from "./packages";
import { users } from "./users";

export const packageItemsHistory = pgTable("package_items_history", {
  id: serial().primaryKey(),
  packageItemId: integer().notNull().references(() => packageItems.id),
  packageId: integer().notNull().references(() => packages.id),
  orderItemId: integer().notNull().references(() => orderItems.id),
  quantityPacked: integer().notNull(),
  version: integer().notNull().default(1),
  validFrom: timestamp({ mode: "string" }).defaultNow().notNull(),
  validTo: timestamp({ mode: "string" }),
  operation: integer().notNull(), // Could be enum or varchar in real implementation
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  createdBy: integer().notNull().references(() => users.id),
  updatedBy: integer().notNull().references(() => users.id),
});

export const packageItemsHistorySchema = createSelectSchema(packageItemsHistory);
export type PackageItemsHistory = z.infer<typeof packageItemsHistorySchema>;
export const insertPackageItemsHistorySchema = createInsertSchema(packageItemsHistory);
export type NewPackageItemsHistory = z.infer<typeof insertPackageItemsHistorySchema>;

export const packageItemsHistoryRelations = relations(packageItemsHistory, ({ one }) => ({
  package: one(packages, {
    fields: [packageItemsHistory.packageId],
    references: [packages.id],
  }),
  packageItem: one(packageItems, {
    fields: [packageItemsHistory.packageItemId],
    references: [packageItems.id],
  }),
  orderItem: one(orderItems, {
    fields: [packageItemsHistory.orderItemId],
    references: [orderItems.id],
  }),
  createdBy: one(users, {
    fields: [packageItemsHistory.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [packageItemsHistory.updatedBy],
    references: [users.id],
  }),
}));

export default packageItemsHistory;
