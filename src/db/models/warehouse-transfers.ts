import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import bins from "./bins";
import { entries } from "./entries";
import { transferStatuses } from "./transfer-statuses";
import { users } from "./users";
import { warehouses } from "./warehouses";

export const warehouseTransfers = pgTable("warehouse_transfers", {
  id: serial().primaryKey(),
  transferCode: varchar().unique().notNull(),
  binId: integer().references(() => bins.id),
  entryId: integer()
    .notNull()
    .references(() => entries.id),
  sourceWarehouseId: integer()
    .notNull()
    .references(() => warehouses.id),
  destinationWarehouseId: integer()
    .notNull()
    .references(() => warehouses.id),
  statusId: integer()
    .notNull()
    .references(() => transferStatuses.id),
  transferDate: timestamp({ mode: "string" }).notNull().defaultNow(),
  notes: text(),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  receivedAt: timestamp({ mode: "string" }),
  createdBy: integer()
    .notNull()
    .references(() => users.id),
  initiatedBy: integer()
    .notNull()
    .references(() => users.id),
  approvedBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
  reversedBy: integer().references(() => users.id),
});

export const warehouseTransfersSchema = createSelectSchema(warehouseTransfers);
export type WarehouseTransfers = z.infer<typeof warehouseTransfersSchema>;
export const insertWarehouseTransfersSchema =
  createInsertSchema(warehouseTransfers);
export type NewWarehouseTransfers = z.infer<
  typeof insertWarehouseTransfersSchema
>;

export const updateWarehouseTransfersSchema =
  createInsertSchema(warehouseTransfers).partial();
export type UpdateWarehouseTransfers = z.infer<
  typeof updateWarehouseTransfersSchema
>;

export const warehouseTransfersRelations = relations(
  warehouseTransfers,
  ({ one }) => ({
    entry: one(entries, {
      fields: [warehouseTransfers.entryId],
      references: [entries.id],
      relationName: "entry",
    }),
    sourceWarehouse: one(warehouses, {
      fields: [warehouseTransfers.sourceWarehouseId],
      references: [warehouses.id],
      relationName: "sourceWarehouse",
    }),
    destinationWarehouse: one(warehouses, {
      fields: [warehouseTransfers.destinationWarehouseId],
      references: [warehouses.id],
      relationName: "destinationWarehouse",
    }),
    transferStatus: one(transferStatuses, {
      fields: [warehouseTransfers.statusId],
      references: [transferStatuses.id],
    }),
    createdBy: one(users, {
      fields: [warehouseTransfers.createdBy],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [warehouseTransfers.updatedBy],
      references: [users.id],
    }),
    initiatedBy: one(users, {
      fields: [warehouseTransfers.initiatedBy],
      references: [users.id],
    }),
    approvedBy: one(users, {
      fields: [warehouseTransfers.approvedBy],
      references: [users.id],
    }),
  }),
);

export default warehouseTransfers;
