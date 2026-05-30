import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { paymentTransactions } from "./payment-transactions";
import { users } from "./users";

export const paymentStatuses = pgTable("payment_statuses", {
  id: serial().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer()
    .references(() => users.id)
    .notNull(),
  updatedBy: integer()
    .references(() => users.id)
    .notNull(),
});
export const paymentStatusesSchema = createSelectSchema(paymentStatuses);

export type PaymentStatuses = z.infer<typeof paymentStatusesSchema>;
export const createPaymentStatusSchema = createInsertSchema(paymentStatuses);
export type CreatePaymentStatus = z.infer<typeof createPaymentStatusSchema>;
export const updatePaymentStatusSchema = createInsertSchema(paymentStatuses);

export default paymentStatuses;

export const paymentStatusesRelations = relations(
  paymentStatuses,
  ({ many }) => ({
    paymentTransactions: many(paymentTransactions),
  }),
);
