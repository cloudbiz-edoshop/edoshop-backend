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

import { bundles } from "./bundles";
import colors from "./colors";
import { entries } from "./entries";
import { items } from "./items";
import { users } from "./users";

export const series = pgTable("series", {
  id: serial().primaryKey(),
  entryId: integer()
    .notNull()
    .references(() => entries.id),
  bundleId: integer().references(() => bundles.id),
  seriesCode: varchar({ length: 255 }).unique().notNull(),
  colorId: integer().references(() => colors.id),
  createdAt: timestamp({ mode: "string" }).notNull(),
  updatedAt: timestamp({ mode: "string" }),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const seriesSchema = createSelectSchema(series);
export type Series = z.infer<typeof seriesSchema>;
export const insertSeriesSchema = createInsertSchema(series);
export type NewSeries = z.infer<typeof insertSeriesSchema>;

export const seriesRelations = relations(series, ({ many, one }) => ({
  entry: one(entries, { fields: [series.entryId], references: [entries.id] }),
  bundle: one(bundles, { fields: [series.bundleId], references: [bundles.id] }),
  color: one(colors, { fields: [series.colorId], references: [colors.id] }),
  createdBy: one(users, { fields: [series.createdBy], references: [users.id] }),
  updatedBy: one(users, { fields: [series.updatedBy], references: [users.id] }),
  items: many(items),
}));

export default series;
