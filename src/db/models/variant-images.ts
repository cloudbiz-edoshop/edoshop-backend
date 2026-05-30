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

import { users } from "./users";
import { variants } from "./variants";

export const variantImages = pgTable("variant_images", {
  id: serial().primaryKey(),
  variantId: integer().references(() => variants.id),
  imageUrl: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).notNull(),
  updatedAt: timestamp({ mode: "string" }),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const variantImagesSchema = createSelectSchema(variantImages);

export type VariantImages = z.infer<typeof variantImagesSchema>;

/**
 * VariantImages insert schema
 */
export const insertVariantImagesSchema = createInsertSchema(variantImages);

/**
 * New variantImages type definition
 */
export type NewVariantImages = z.infer<typeof insertVariantImagesSchema>;

export default variantImages;

export const variantImagesRelations = relations(variantImages, ({ one }) => ({
  variant: one(variants, {
    fields: [variantImages.variantId],
    references: [variants.id],
  }),
  createdBy: one(users, {
    fields: [variantImages.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [variantImages.updatedBy],
    references: [users.id],
  }),
}));
