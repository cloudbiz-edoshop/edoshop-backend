// Table customers {
//   id int [primary key]
//   user_id int [unique, ref: > users.id]
//   customer_code varchar [unique, note: 'Format: C {CountryCode}_ {SequentialAlphaNum}, e.g., CPK_A01']
//   preferred_payment_method_id int [ref: > payment_methods.id]
//   is_active boolean [default: true]
//   created_at timestamp [not null]
//   updated_at timestamp
//   created_by int [ref: > users.id]
//   updated_by int [ref: > users.id]
// }
import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { constraintAndMessages } from "@/constants";

import orders from "./orders";
import { paymentMethods } from "./payment-methods";
import users from "./users";

export const customers = pgTable("customers", {
  id: serial().primaryKey(),
  userId: integer()
    .references(() => users.id)
    .unique()
    .notNull(),
  customerCode: varchar({
    length: constraintAndMessages.CUSTOMER_CODE.MAX_LENGTH,
  })
    .notNull()
    .unique(),
  preferredPaymentMethodId: integer().references(() => paymentMethods.id),
  isActive: boolean().notNull().default(true),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer()
    .references(() => users.id)
    .notNull(),
  updatedBy: integer()
    .references(() => users.id)
    .notNull(),
  isDeleted: boolean().notNull().default(false),
  deletedAt: timestamp({ mode: "string" }),
  deletedBy: integer().references(() => users.id),
});

// Customer relations
export const customersRelations = relations(customers, ({ one, many }) => ({
  // One-to-one relation with User
  user: one(users, {
    fields: [customers.userId],
    references: [users.id],
  }),

  //  One-to-many relation with Orders
  orders: many(orders),

  // reference for tracking who created this user
  createdByUser: one(users, {
    fields: [customers.createdBy],
    references: [users.id],
    relationName: "customerCreatedBy",
  }),
  // Self-reference for tracking who last modified this user
  updatedByUser: one(users, {
    fields: [customers.updatedBy],
    references: [users.id],
    relationName: "customerUpdatedBy",
  }),
  // reference for tracking who deleted this user
  deletedByUser: one(users, {
    fields: [customers.deletedBy],
    references: [users.id],
    relationName: "customerDeletedBy",
  }),
}));

// create insert schema
export const insertCustomerSchema = createInsertSchema(customers);

// create update schema
export const updateCustomerSchema = createInsertSchema(customers).partial();

// create select schema
export const customerSchema = createSelectSchema(customers);

// export type
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

export default customers;
