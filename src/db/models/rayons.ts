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

import { shelves } from "./shelves";
import { users } from "./users";
import warehouses from "./warehouses";

export const rayons = pgTable("rayons", {
  id: serial().primaryKey(),
  warehouseId: integer().notNull().references(() => warehouses.id),
  name: varchar({ length: 100 }),
  description: text(),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).defaultNow(),
  createdBy: integer()
    .references(() => users.id)
    .notNull(),
  updatedBy: integer()
    .references(() => users.id),
});

export const rayonsSchema = createSelectSchema(rayons);
export type Rayons = z.infer<typeof rayonsSchema>;

export const createRayonSchema = createInsertSchema(rayons);
export type CreateRayon = z.infer<typeof createRayonSchema>;

export const rayonsRelations = relations(rayons, ({ many }) => ({
  shelves: many(shelves),

}));

export default rayons;
