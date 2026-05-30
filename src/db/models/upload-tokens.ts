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

export const uploadTokens = pgTable("upload_tokens", {
  id: serial().primaryKey(),
  token: varchar({ length: 128 }).notNull().unique(),
  entryId: integer()
    .notNull()
    .references(() => entries.id, { onDelete: "cascade" }),
  expiresAt: timestamp({ mode: "string" }).notNull(),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
});

export const uploadTokensRelations = relations(uploadTokens, ({ one }) => ({
  entry: one(entries, {
    fields: [uploadTokens.entryId],
    references: [entries.id],
  }),
}));

export const insertUploadTokenSchema = createInsertSchema(uploadTokens);
export const selectUploadTokenSchema = createSelectSchema(uploadTokens);

export type NewUploadToken = z.infer<typeof insertUploadTokenSchema>;
export type UploadToken = z.infer<typeof selectUploadTokenSchema>;

export default uploadTokens;
