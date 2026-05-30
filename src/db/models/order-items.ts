import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  decimal,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { fulfillmentStates } from "./fulfillment-states";
import { orderItemFulfillmentStatuses } from "./order-item-fulfillment-statuses";
import { orders } from "./orders";
import { packageItems } from "./package-items";
import { products } from "./products";
import { variants } from "./variants";

export const orderItems = pgTable("order_items", {
  id: serial().primaryKey(),
  orderId: integer().notNull().references(() => orders.id),
  productId: integer().notNull().references(() => products.id),
  variantId: integer().notNull().references(() => variants.id),
  fulfillmentStatesId: integer().default(1).references(() => fulfillmentStates.id),
  fulfillmentStatusId: integer().references(() => orderItemFulfillmentStatuses.id),
  quantity: integer().notNull().default(1),
  unitPrice: decimal().notNull(),
  subTotal: decimal().notNull(),
  quantityAvailable: integer().notNull().default(0),
  quantityPacked: integer().notNull().default(0),
  notes: text(),
  // Snapshot fields - captured at order creation time for historical accuracy
  productName: text().notNull(),
  productCode: text(),
  variantCode: text().notNull(),
  colorName: text().notNull(),
  sizeName: text().notNull(),
  productImageUrl: text(),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer().notNull(),
  updatedBy: integer().notNull(),
});

export const orderItemsSchema = createSelectSchema(orderItems);
export type OrderItems = z.infer<typeof orderItemsSchema>;

export const insertOrderItemsSchema = createInsertSchema(orderItems);
export type NewOrderItems = z.infer<typeof insertOrderItemsSchema>;

export const updateOrderItemsSchema = insertOrderItemsSchema.partial();
export type UpdateOrderItems = z.infer<typeof updateOrderItemsSchema>;

export default orderItems;

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  fulfillmentState: one(fulfillmentStates, { fields: [orderItems.fulfillmentStatesId], references: [fulfillmentStates.id] }),
  fulfillmentStatus: one(orderItemFulfillmentStatuses, { fields: [orderItems.fulfillmentStatusId], references: [orderItemFulfillmentStatuses.id] }),
  variant: one(variants, { fields: [orderItems.variantId], references: [variants.id] }),
  packageItems: many(packageItems),
}));
