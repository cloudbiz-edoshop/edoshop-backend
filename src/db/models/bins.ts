import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { shelves } from "./shelves";
import { storage } from "./storage";
import { users } from "./users";
import warehouses from "./warehouses";

export const bins = pgTable("bins", {
  id: serial().primaryKey(),
  shelfId: integer().notNull().references(() => shelves.id),
  warehouseId: integer().notNull().references(() => warehouses.id),
  rowNumber: integer().notNull(),
  locationCode: varchar({ length: 20 }).notNull(),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).defaultNow(),
  createdBy: integer().references(() => users.id).notNull(),
  updatedBy: integer().references(() => users.id),
}, (table) => ({
  warehouseLocationCodeUnique: uniqueIndex(
    "bins_warehouse_location_code_unique",
  ).on(table.warehouseId, table.locationCode),
}));

export const binsSchema = createSelectSchema(bins);
export type Bins = z.infer<typeof binsSchema>;
export const createBinSchema = createInsertSchema(bins);
export type CreateBin = z.infer<typeof createBinSchema>;

export const binsRelations = relations(bins, ({ one, many }) => ({
  shelf: one(shelves, { fields: [bins.shelfId], references: [shelves.id] }),
  storageItems: many(storage),
}));

export default bins;
