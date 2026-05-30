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
import packages from "./packages";
import { users } from "./users";

// Table package_items {
//   id int[primary key]
//   package_id int[ref: > packages.id, not null]
//   order_item_id int[ref: > order_items.id, not null]
//   quantity_packed int[not null, note: 'Quantity included in this package']
//   version integer[not null, default: 1, note: 'Increments with each update']
//   created_at timestamp[not null, default: 'NOW()']
//   updated_at timestamp[default: 'NOW()']
//   created_by int[ref: > users.id]
//   updated_by int[ref: > users.id]

//   indexes {
//     package_id
//     order_item_id
//       (package_id, order_item_id)[unique]
//       (order_item_id, package_id)
//   }

//   note: '''
//   Tracks which order items are packed in each package and their quantities.
//   Supports partial fulfillment - quantity_packed can be less than order_items.quantity.

//   Business Rules(enforced in application logic):
//   1. quantity_packed must be > 0
//   2. Sum of quantity_packed for an order_item across all packages must not exceed order_items.quantity
//   3. All order_items in a package must belong to orders from the same customer
//   4. Cannot add / modify / remove items if package status is "shipped", "delivered", or "cancelled"
//   5. When modifying quantity_packed, must recalculate order_items.quantity_packed and fulfillment_status_id
//   6. When modifying package_items, must recalculate orders.fulfillment_status_id

//   History Tracking:
//   - All INSERT, UPDATE, DELETE operations are logged to package_items_history
//     - Version number increments with each modification
//   '''
// }

export const packageItems = pgTable("package_items", {
  id: serial().primaryKey(),
  packageId: integer().notNull().references(() => packages.id),
  orderItemId: integer().notNull().references(() => orderItems.id),
  quantityPacked: integer().notNull(),
  version: integer().notNull().default(1),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  createdBy: integer().notNull().references(() => users.id),
  updatedBy: integer().notNull().references(() => users.id),
});

export const packageItemsSchema = createSelectSchema(packageItems);
export type PackageItems = z.infer<typeof packageItemsSchema>;
export const insertPackageItemsSchema = createInsertSchema(packageItems);
export type NewPackageItems = z.infer<typeof insertPackageItemsSchema>;

export const packageItemsRelations = relations(packageItems, ({ one }) => ({
  package: one(packages, {
    fields: [packageItems.packageId],
    references: [packages.id],
  }),
  orderItem: one(orderItems, {
    fields: [packageItems.orderItemId],
    references: [orderItems.id],
  }),
  createdBy: one(users, {
    fields: [packageItems.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [packageItems.updatedBy],
    references: [users.id],
  }),
}));

export default packageItems;
