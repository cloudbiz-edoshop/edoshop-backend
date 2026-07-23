import type { z } from "zod";

import { integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { users } from "./users";

export const warehouseTicketSettings = pgTable("warehouse_ticket_settings", {
  id: serial("id").primaryKey(),
  maxLineItems: integer("max_line_items").notNull().default(20),
  maxTotalQuantity: integer("max_total_quantity").notNull().default(50),
  maxOpenTicketsPerUser: integer("max_open_tickets_per_user")
    .notNull()
    .default(5),
  returnReminderDays: integer("return_reminder_days").notNull().default(7),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
  updatedBy: integer("updated_by").references(() => users.id),
});

export const warehouseTicketSettingsSchema =
  createSelectSchema(warehouseTicketSettings);
export type WarehouseTicketSettings = z.infer<
  typeof warehouseTicketSettingsSchema
>;

export const insertWarehouseTicketSettingsSchema =
  createInsertSchema(warehouseTicketSettings);
export type NewWarehouseTicketSettings = z.infer<
  typeof insertWarehouseTicketSettingsSchema
>;

export default warehouseTicketSettings;
