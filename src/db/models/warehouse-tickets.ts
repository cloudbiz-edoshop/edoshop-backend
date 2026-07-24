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
import { users } from "./users";
import { warehouses } from "./warehouses";

export const warehouseTickets = pgTable("warehouse_tickets", {
  id: serial("id").primaryKey(),
  ticketCode: varchar("ticket_code", { length: 64 }).notNull().unique(),
  warehouseId: integer("warehouse_id")
    .references(() => warehouses.id)
    .notNull(),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  pausedFromStatus: varchar("paused_from_status", { length: 32 }),
  statusComment: text("status_comment"),
  requesterId: integer("requester_id")
    .references(() => users.id)
    .notNull(),
  approverId: integer("approver_id").references(() => users.id),
  warehouseTechId: integer("warehouse_tech_id").references(() => users.id),
  approvedAt: timestamp("approved_at", { mode: "string" }),
  pausedAt: timestamp("paused_at", { mode: "string" }),
  rejectedAt: timestamp("rejected_at", { mode: "string" }),
  confirmedAt: timestamp("confirmed_at", { mode: "string" }),
  completedAt: timestamp("completed_at", { mode: "string" }),
  borrowDueAt: timestamp("borrow_due_at", { mode: "string" }),
  lastReturnReminderAt: timestamp("last_return_reminder_at", { mode: "string" }),
  totalQuantity: integer("total_quantity").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
  createdBy: integer("created_by")
    .references(() => users.id)
    .notNull(),
  updatedBy: integer("updated_by")
    .references(() => users.id)
    .notNull(),
});

export const warehouseTicketItems = pgTable("warehouse_ticket_items", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id")
    .references(() => warehouseTickets.id, { onDelete: "cascade" })
    .notNull(),
  entryId: integer("entry_id").references(() => entries.id),
  productLabel: varchar("product_label", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 128 }),
  quantity: integer("quantity").notNull(),
  transferredQuantity: integer("transferred_quantity").notNull().default(0),
  returnedQuantity: integer("returned_quantity").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

export const warehouseTicketEvents = pgTable("warehouse_ticket_events", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id")
    .references(() => warehouseTickets.id, { onDelete: "cascade" })
    .notNull(),
  actorId: integer("actor_id")
    .references(() => users.id)
    .notNull(),
  action: varchar("action", { length: 32 }).notNull(),
  comment: text("comment"),
  previousStatus: varchar("previous_status", { length: 32 }),
  newStatus: varchar("new_status", { length: 32 }),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export const warehouseTicketsSchema = createSelectSchema(warehouseTickets);
export type WarehouseTicket = z.infer<typeof warehouseTicketsSchema>;

export const warehouseTicketItemsSchema = createSelectSchema(warehouseTicketItems);
export type WarehouseTicketItem = z.infer<typeof warehouseTicketItemsSchema>;

export const warehouseTicketEventsSchema = createSelectSchema(warehouseTicketEvents);
export type WarehouseTicketEvent = z.infer<typeof warehouseTicketEventsSchema>;

export const insertWarehouseTicketSchema = createInsertSchema(warehouseTickets);
export type NewWarehouseTicket = z.infer<typeof insertWarehouseTicketSchema>;

export const warehouseTicketsRelations = relations(
  warehouseTickets,
  ({ one, many }) => ({
    warehouse: one(warehouses, {
      fields: [warehouseTickets.warehouseId],
      references: [warehouses.id],
    }),
    requester: one(users, {
      fields: [warehouseTickets.requesterId],
      references: [users.id],
      relationName: "ticketRequester",
    }),
    approver: one(users, {
      fields: [warehouseTickets.approverId],
      references: [users.id],
      relationName: "ticketApprover",
    }),
    warehouseTech: one(users, {
      fields: [warehouseTickets.warehouseTechId],
      references: [users.id],
      relationName: "ticketWarehouseTech",
    }),
    createdByUser: one(users, {
      fields: [warehouseTickets.createdBy],
      references: [users.id],
      relationName: "ticketCreatedBy",
    }),
    updatedByUser: one(users, {
      fields: [warehouseTickets.updatedBy],
      references: [users.id],
      relationName: "ticketUpdatedBy",
    }),
    items: many(warehouseTicketItems),
    events: many(warehouseTicketEvents),
  }),
);

export const warehouseTicketItemsRelations = relations(
  warehouseTicketItems,
  ({ one }) => ({
    ticket: one(warehouseTickets, {
      fields: [warehouseTicketItems.ticketId],
      references: [warehouseTickets.id],
    }),
    entry: one(entries, {
      fields: [warehouseTicketItems.entryId],
      references: [entries.id],
    }),
  }),
);

export const warehouseTicketEventsRelations = relations(
  warehouseTicketEvents,
  ({ one }) => ({
    ticket: one(warehouseTickets, {
      fields: [warehouseTicketEvents.ticketId],
      references: [warehouseTickets.id],
    }),
    actor: one(users, {
      fields: [warehouseTicketEvents.actorId],
      references: [users.id],
    }),
  }),
);

export default warehouseTickets;
