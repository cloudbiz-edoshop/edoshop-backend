import type { z } from "zod";

import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { bins } from "./bins";
import { rayons } from "./rayons";
import { users } from "./users";
import warehouses from "./warehouses";

export const shelves = pgTable("shelves", {
  id: serial().primaryKey(),
  rayonId: integer().notNull().references(() => rayons.id),
  warehouseId: integer().notNull().references(() => warehouses.id),
  columnLabel: varchar({ length: 5 }).notNull(),
  description: text(),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).defaultNow(),
  createdBy: integer()
    .references(() => users.id)
    .notNull(),
  updatedBy: integer()
    .references(() => users.id),
});

export const shelvesSchema = createSelectSchema(shelves);
export type Shelves = z.infer<typeof shelvesSchema>;

export const createShelfSchema = createInsertSchema(shelves);
export type CreateShelf = z.infer<typeof createShelfSchema>;

export const shelvesRelations = relations(shelves, ({ one, many }) => ({
  rayon: one(rayons, { fields: [shelves.rayonId], references: [rayons.id] }),
  bins: many(bins),
}));

export default shelves;
