import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";

import { countries } from "./countries";
import { orders } from "./orders";
import paymentMethodTypes from "./payment-method-types";
import { paymentTransactions } from "./payment-transactions";
import { users } from "./users";

export const paymentMethods = pgTable("payment_methods", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull().unique(),
  countryId: integer()
    .references(() => countries.id)
    .notNull(),
  description: varchar({ length: 255 }),
  isActive: boolean().notNull().default(true),
  isDeleted: boolean().notNull().default(false),
  deletedAt: timestamp({ mode: "string" }),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer()
    .references(() => users.id)
    .notNull(),
  updatedBy: integer()
    .references(() => users.id)
    .notNull(),
  deletedBy: integer().references(() => users.id),
});

export const paymentMethodsSchema = createSelectSchema(paymentMethods);

export type PaymentMethods = z.infer<typeof paymentMethodsSchema>;

export default paymentMethods;

export const paymentMethodsRelations = relations(
  paymentMethods,
  ({ one, many }) => ({
    paymentMethodTypes: many(paymentMethodTypes),
    paymentTransactions: many(paymentTransactions),
    orders: many(orders),
    country: one(countries, {
      fields: [paymentMethods.countryId],
      references: [countries.id],
    }),
    createdBy: one(users, {
      fields: [paymentMethods.createdBy],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [paymentMethods.updatedBy],
      references: [users.id],
    }),
  }),
);
