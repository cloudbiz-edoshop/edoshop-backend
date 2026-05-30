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

import entryTypes from "./entry-types";
import { paymentMethods } from "./payment-methods";
import users from "./users";

export const suppliers = pgTable("suppliers", {
  id: serial().primaryKey(),
  userId: integer()
    .references(() => users.id)
    .unique()
    .notNull(),
  storeName: varchar({ length: 255 }).notNull(),
  supplierCode: varchar({ length: 255 }).unique().notNull(),
  entryTypeId: integer().references(() => entryTypes.id),
  paymentMethodId: integer().references(() => paymentMethods.id),
  bankAccountName: varchar({ length: 255 }),
  bankAccountNumber: varchar({ length: 255 }),
  isActive: boolean().notNull().default(true),
  createdBy: integer()
    .references(() => users.id)
    .notNull(),
  updatedBy: integer()
    .references(() => users.id)
    .notNull(),
  deletedBy: integer().references(() => users.id),
  deletedAt: timestamp({ mode: "string" }),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  isDeleted: boolean().notNull().default(false),
});

// Supplier relations
export const suppliersRelations = relations(suppliers, ({ one }) => ({
  // One-to-one relation with user
  user: one(users, {
    fields: [suppliers.userId],
    references: [users.id],
  }),
  // Relation to user who created this supplier
  createdByUser: one(users, {
    fields: [suppliers.createdBy],
    references: [users.id],
    relationName: "supplierCreatedBy",
  }),
  // Relation to user who last modified this supplier
  updatedByUser: one(users, {
    fields: [suppliers.updatedBy],
    references: [users.id],
    relationName: "supplierModifiedBy",
  }),
  // Relation to user who deleted this supplier
  deletedByUser: one(users, {
    fields: [suppliers.deletedBy],
    references: [users.id],
    relationName: "supplierDeletedBy",
  }),
  entryType: one(entryTypes, {
    fields: [suppliers.entryTypeId],
    references: [entryTypes.id],
  }),
  paymentMethod: one(paymentMethods, {
    fields: [suppliers.paymentMethodId],
    references: [paymentMethods.id],
  }),
}));

export const supplierSchema = createSelectSchema(suppliers);

export type Supplier = z.infer<typeof supplierSchema>;

export default suppliers;
