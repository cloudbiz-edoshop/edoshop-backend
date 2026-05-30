import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { orders } from "./orders";
import { paymentMethods } from "./payment-methods";
import { paymentStatuses } from "./payment-statuses";
import { users } from "./users";

export const paymentTransactions = pgTable("payment_transactions", {
  id: serial().primaryKey(),
  orderId: integer().references(() => orders.id).notNull(),
  amount: decimal({ precision: 10, scale: 2 }).notNull(),
  paymentMethodId: integer().references(() => paymentMethods.id).notNull(),
  paymentStatusId: integer().references(() => paymentStatuses.id).notNull(),
  transactionReference: varchar({ length: 100 }).notNull(),
  transactionDate: timestamp({ mode: "string" }).notNull(),
  version: integer().notNull().default(1),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer()
    .references(() => users.id)
    .notNull(),
  updatedBy: integer()
    .references(() => users.id)
    .notNull(),
  isDeleted: boolean().default(false),
  deletedAt: timestamp({ mode: "string" }),
  deletedBy: integer()
    .references(() => users.id),
});

export const paymentTransactionsSchema = createSelectSchema(paymentTransactions);
export type PaymentTransactions = z.infer<typeof paymentTransactionsSchema>;
export const createPaymentTransactionSchema = createInsertSchema(paymentTransactions);
export type CreatePaymentTransaction = z.infer<typeof createPaymentTransactionSchema>;

export default paymentTransactions;

export const paymentTransactionsRelations = relations(
  paymentTransactions,
  ({ one }) => ({
    order: one(orders, {
      fields: [paymentTransactions.orderId],
      references: [orders.id],
    }),
    paymentMethod: one(paymentMethods, {
      fields: [paymentTransactions.paymentMethodId],
      references: [paymentMethods.id],
    }),
    paymentStatus: one(paymentStatuses, {
      fields: [paymentTransactions.paymentStatusId],
      references: [paymentStatuses.id],
    }),
  }),
);
