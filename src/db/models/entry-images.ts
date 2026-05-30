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

export const entryImages = pgTable("entry_images", {
  id: serial().primaryKey(),
  entryId: integer()
    .notNull()
    .references(() => entries.id, { onDelete: "cascade" }),
  fileName: varchar({ length: 512 }).notNull(),
  url: varchar({ length: 1024 }).notNull(),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
});

export const entryImagesRelations = relations(entryImages, ({ one }) => ({
  entry: one(entries, {
    fields: [entryImages.entryId],
    references: [entries.id],
  }),
}));

export const insertEntryImageSchema = createInsertSchema(entryImages);
export const selectEntryImageSchema = createSelectSchema(entryImages);

export type NewEntryImage = z.infer<typeof insertEntryImageSchema>;
export type EntryImage = z.infer<typeof selectEntryImageSchema>;

export default entryImages;
