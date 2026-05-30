import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  decimal,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { bundles } from "./bundles";
import { customers } from "./customers"; // Add this import
import { entriesHistory } from "./entries-history";
import { entryImages } from "./entry-images";
import { entryProducts } from "./entry-products";
import { entryStates } from "./entry-states";
import { entryTypes } from "./entry-types";
import { items } from "./items";
import { packages } from "./packages";
import { returns } from "./returns";
import { series } from "./series";
import { storage } from "./storage";
import { suppliers } from "./suppliers";
import { uploadTokens } from "./upload-tokens";
import { users } from "./users";
import { warehouseTransfers } from "./warehouse-transfers";
import { warehouses } from "./warehouses";

export const entries = pgTable("entries", {
  id: serial().primaryKey(),
  entryTypeId: integer()
    .notNull()
    .references(() => entryTypes.id),
  entryStateId: integer().references(() => entryStates.id),
  isTransferable: boolean().notNull().default(false),
  isSent: boolean().notNull().default(false),
  quantity: integer().notNull(),
  weight: decimal("weight", { precision: 10, scale: 2 }).notNull(),
  date: date().notNull(),
  warehouseId: integer()
    .notNull()
    .references(() => warehouses.id),
  supplierId: integer().references(() => suppliers.id), // For New Entry
  customerId: integer().references(() => customers.id), // For Returns & Packages
  description: varchar({ length: 255 }),
  version: integer().notNull().default(1), // Increments with each update
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
  isDeleted: boolean().notNull().default(false),
  deletedAt: timestamp({ mode: "string" }),
  deletedBy: integer().references(() => users.id),
});

export const entriesRelations = relations(entries, ({ many, one }) => ({
  entryHistory: many(entriesHistory),
  entryType: one(entryTypes, {
    fields: [entries.entryTypeId],
    references: [entryTypes.id],
  }),
  storage: many(storage),
  entryState: one(entryStates, {
    fields: [entries.entryStateId],
    references: [entryStates.id],
  }),
  warehouse: one(warehouses, {
    fields: [entries.warehouseId],
    references: [warehouses.id],
  }),
  supplier: one(suppliers, {
    fields: [entries.supplierId],
    references: [suppliers.id],
  }),
  customer: one(customers, {
    // Add customer relation
    fields: [entries.customerId],
    references: [customers.id],
  }),
  createdByUser: one(users, {
    fields: [entries.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [entries.updatedBy],
    references: [users.id],
  }),
  deletedByUser: one(users, {
    fields: [entries.deletedBy],
    references: [users.id],
  }),
  bundles: many(bundles),
  series: many(series),
  items: many(items),
  packages: many(packages),
  returnsAsReturnEntry: many(returns, {
    relationName: "returnEntry",
  }),
  returnsAsOriginalEntry: many(returns, {
    relationName: "originalEntry",
  }),
  entryProducts: many(entryProducts),
  entryImages: many(entryImages),
  uploadTokens: many(uploadTokens),
  warehouseTransfers: many(warehouseTransfers),
}));

export const insertEntriesSchema = createInsertSchema(entries);

export const selectEntriesSchema = createSelectSchema(entries);

export type NewEntry = z.infer<typeof insertEntriesSchema>;

export type Entry = z.infer<typeof selectEntriesSchema>;

export default entries;
