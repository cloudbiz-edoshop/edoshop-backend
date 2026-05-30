import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import addresses from "./addresses";
import users from "./users";
import warehouseTransfers from "./warehouse-transfers";

/**
 * Warehouses table schema
 */
export const warehouses = pgTable("warehouses", {
  id: serial().primaryKey(),
  name: text().notNull().unique(),
  addressId: integer()
    .notNull()
    .references(() => addresses.id),
  description: text(),
  isActive: boolean().notNull().default(true),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  isDeleted: boolean().notNull().default(false),
  deletedAt: timestamp({ mode: "string" }),
  createdBy: integer()
    .notNull()
    .references(() => users.id),
  updatedBy: integer()
    .notNull()
    .references(() => users.id),
  deletedBy: integer().references(() => users.id),
});

/**
 * Warehouses table relations
 */
const warehousesRelations = relations(warehouses, ({ one, many }) => ({
  address: one(addresses, {
    fields: [warehouses.addressId],
    references: [addresses.id],
  }),
  outgoingTransfers: many(warehouseTransfers, {
    relationName: "sourceWarehouse",
  }),
  incomingTransfers: many(warehouseTransfers, {
    relationName: "destinationWarehouse",
  }),
  createdByUser: one(users, {
    fields: [warehouses.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [warehouses.updatedBy],
    references: [users.id],
  }),
  deletedByUser: one(users, {
    fields: [warehouses.deletedBy],
    references: [users.id],
  }),
}));

/**
 * Warehouse insert schema
 */
const insertWarehouseSchema = createInsertSchema(warehouses);

/**
 * Retailer select schema
 */
const selectWarehouseSchema = createSelectSchema(warehouses);

/**
 * New retailer type definition
 */
type NewWarehouse = z.infer<typeof insertWarehouseSchema>;

/**
 * Retailer type definition
 */
type Warehouse = z.infer<typeof selectWarehouseSchema>;

export default warehouses;
export { insertWarehouseSchema, selectWarehouseSchema, warehousesRelations };
export type { NewWarehouse, Warehouse };
