import type { z } from "zod";

import { relations } from "drizzle-orm";
import { date, integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { users } from "./users";

export const newArrivals = pgTable("new_arrivals", {
  id: serial().primaryKey(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const newArrivalsSchema = createSelectSchema(newArrivals);

export type NewArrivals = z.infer<typeof newArrivalsSchema>;

/**
 * New arrivals insert schema
 */
export const insertNewArrivalsSchema = createInsertSchema(newArrivals);

/**
 * New arrivals type definition
 */
export type NewNewArrivals = z.infer<typeof insertNewArrivalsSchema>;

export default newArrivals;

export const newArrivalsRelations = relations(newArrivals, ({ one }) => ({
  createdBy: one(users, {
    fields: [newArrivals.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [newArrivals.updatedBy],
    references: [users.id],
  }),
}));
