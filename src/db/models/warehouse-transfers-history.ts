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
import { entries } from "./entries";
import { transferStatuses } from "./transfer-statuses";
import { users } from "./users";
import { warehouseTransfers } from "./warehouse-transfers";
import { warehouses } from "./warehouses";

export const warehouseTransfersHistory = pgTable(
  "warehouse_transfers_history",
  {
    id: serial().primaryKey(),
    transferCode: varchar().notNull(),
    transferId: integer()
      .notNull()
      .references(() => warehouseTransfers.id),

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
    // transferDate: timestamp({ mode: "string" }).notNull(),
    notes: text(),
    createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp({ mode: "string" }).defaultNow(),
    createdBy: integer()
      .notNull()
      .references(() => users.id),
    initiatedBy: integer()
      .notNull()
      .references(() => users.id),
    approvedBy: integer().references(() => users.id),
    updatedBy: integer().references(() => users.id),
  },
);

export const warehouseTransfersHistorySchema = createSelectSchema(
  warehouseTransfersHistory,
);
export type WarehouseTransfersHistory = z.infer<
  typeof warehouseTransfersHistorySchema
>;
export const insertWarehouseTransfersHistorySchema = createInsertSchema(
  warehouseTransfersHistory,
);
export type NewWarehouseTransfersHistory = z.infer<
  typeof insertWarehouseTransfersHistorySchema
>;

export const warehouseTransfersHistoryRelations = relations(
  warehouseTransfersHistory,
  ({ one }) => ({
    entry: one(entries, {
      fields: [warehouseTransfersHistory.entryId],
      references: [entries.id],
    }),
    transfer: one(warehouseTransfers, {
      fields: [warehouseTransfersHistory.transferId],
      references: [warehouseTransfers.id],
    }),
    sourceWarehouse: one(warehouses, {
      fields: [warehouseTransfersHistory.sourceWarehouseId],
      references: [warehouses.id],
      relationName: "sourceWarehouse",
    }),
    destinationWarehouse: one(warehouses, {
      fields: [warehouseTransfersHistory.destinationWarehouseId],
      references: [warehouses.id],
      relationName: "destinationWarehouse",
    }),
    transferStatus: one(transferStatuses, {
      fields: [warehouseTransfersHistory.statusId],
      references: [transferStatuses.id],
    }),
    createdByUser: one(users, {
      fields: [warehouseTransfersHistory.createdBy],
      references: [users.id],
    }),
    updatedByUser: one(users, {
      fields: [warehouseTransfersHistory.updatedBy],
      references: [users.id],
    }),
    initiatedByUser: one(users, {
      fields: [warehouseTransfersHistory.initiatedBy],
      references: [users.id],
    }),
    approvedByUser: one(users, {
      fields: [warehouseTransfersHistory.approvedBy],
      references: [users.id],
    }),
  }),
);

export default warehouseTransfersHistory;
