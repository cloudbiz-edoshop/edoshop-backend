import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { entries } from "./entries";
import { series } from "./series";
import { sizes } from "./sizes";
import { users } from "./users";

export const items = pgTable("items", {
  id: serial().primaryKey(),
  entryId: integer()
    .notNull()
    .references(() => entries.id),
  seriesId: integer().references(() => series.id),
  itemCode: varchar({ length: 255 }).unique().notNull(),
  sizeId: integer().references(() => sizes.id),
  createdAt: timestamp({ mode: "string" }).notNull(),
  updatedAt: timestamp({ mode: "string" }),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const itemsSchema = createSelectSchema(items);
export type Items = z.infer<typeof itemsSchema>;
export const insertItemsSchema = createInsertSchema(items);
export type NewItems = z.infer<typeof insertItemsSchema>;

export const itemsRelations = relations(items, ({ one }) => ({
  entry: one(entries, { fields: [items.entryId], references: [entries.id] }),
  series: one(series, { fields: [items.seriesId], references: [series.id] }),
  size: one(sizes, { fields: [items.sizeId], references: [sizes.id] }),
  createdBy: one(users, { fields: [items.createdBy], references: [users.id] }),
  updatedBy: one(users, { fields: [items.updatedBy], references: [users.id] }),
}));

export default items;
