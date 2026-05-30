import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { addresses } from "./addresses";
import { customers } from "./customers";
import orderFulfillmentStatuses from "./order-fulfillment-statuses";
import { orderItems } from "./order-items";
import { orderStatuses } from "./order-statuses";
import { orderTypes } from "./order-types";
import { paymentMethods } from "./payment-methods";
import { paymentTransactions } from "./payment-transactions";
import { shippingPriorityCodes } from "./shipping-priority-codes";
import { shippingTypes } from "./shipping-types";
import { users } from "./users";

export const orders = pgTable("orders", {
  id: serial().primaryKey(),
  customerId: integer().notNull().references(() => customers.id),
  orderCode: varchar({ length: 50 }).notNull().unique(),
  orderDate: timestamp({ mode: "string" }).defaultNow(),
  statusId: integer().notNull().references(() => orderStatuses.id),
  fulfillmentStatusId: integer().notNull().references(() => orderFulfillmentStatuses.id),
  orderTypeId: integer().notNull().references(() => orderTypes.id),
  shippingAddressId: integer().references(() => addresses.id),
  shippingPriorityCodeId: integer().references(() => shippingPriorityCodes.id),
  shippingTypeId: integer().default(1).references(() => shippingTypes.id),
  billingAddressId: integer().references(() => addresses.id),
  paymentMethodId: integer().references(() => paymentMethods.id),
  subtotal: decimal({ precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal({ precision: 10, scale: 2 }).notNull().default("0"),
  shippingAmount: decimal({ precision: 10, scale: 2 }).notNull().default("0"),
  discountAmount: decimal({ precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: decimal({ precision: 10, scale: 2 }).notNull(),
  notes: text(),
  version: integer().notNull().default(1),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow(),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
  isDeleted: boolean().default(false),
  deletedAt: timestamp({ mode: "string" }),
  deletedBy: integer().references(() => users.id),
});

export const ordersSchema = createSelectSchema(orders);
export type Orders = z.infer<typeof ordersSchema>;

export const insertOrdersSchema = createInsertSchema(orders);
export type NewOrders = z.infer<typeof insertOrdersSchema>;

export default orders;

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  orderStatus: one(orderStatuses, { fields: [orders.statusId], references: [orderStatuses.id] }),
  fulfillmentStatus: one(orderFulfillmentStatuses, { fields: [orders.fulfillmentStatusId], references: [orderFulfillmentStatuses.id] }),
  orderType: one(orderTypes, { fields: [orders.orderTypeId], references: [orderTypes.id] }),
  shippingPriorityCode: one(shippingPriorityCodes, { fields: [orders.shippingPriorityCodeId], references: [shippingPriorityCodes.id] }),
  orderItems: many(orderItems),
  paymentTransactions: many(paymentTransactions),
  shippingAddress: one(addresses, { fields: [orders.shippingAddressId], references: [addresses.id], relationName: "shippingAddress" }),
  billingAddress: one(addresses, { fields: [orders.billingAddressId], references: [addresses.id], relationName: "billingAddress" }),
  paymentMethod: one(paymentMethods, { fields: [orders.paymentMethodId], references: [paymentMethods.id] }),
  shippingType: one(shippingTypes, { fields: [orders.shippingTypeId], references: [shippingTypes.id] }),
  createdBy: one(users, { fields: [orders.createdBy], references: [users.id] }),
  updatedBy: one(users, { fields: [orders.updatedBy], references: [users.id] }),
  deletedBy: one(users, { fields: [orders.deletedBy], references: [users.id] }),
}));
