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
import { users } from "./users";

export const bundles = pgTable("bundles", {
  id: serial().primaryKey(),
  entryId: integer()
    .notNull()
    .references(() => entries.id),
  bundleCode: varchar({ length: 255 }).unique().notNull(),
  createdAt: timestamp({ mode: "string" }).notNull(),
  updatedAt: timestamp({ mode: "string" }),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const bundlesSchema = createSelectSchema(bundles);
export type Bundles = z.infer<typeof bundlesSchema>;
export const insertBundlesSchema = createInsertSchema(bundles);
export type NewBundles = z.infer<typeof insertBundlesSchema>;

export const bundlesRelations = relations(bundles, ({ many, one }) => ({
  entry: one(entries, { fields: [bundles.entryId], references: [entries.id] }),
  createdBy: one(users, {
    fields: [bundles.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [bundles.updatedBy],
    references: [users.id],
  }),
  series: many(series),
}));

export default bundles;
