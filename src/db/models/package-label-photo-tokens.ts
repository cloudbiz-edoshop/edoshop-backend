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

import packages from "./packages";

/** Short-lived tokens that let a phone upload the label photo without login. */
export const packageLabelPhotoTokens = pgTable("package_label_photo_tokens", {
  id: serial().primaryKey(),
  token: varchar({ length: 128 }).notNull().unique(),
  packageId: integer()
    .notNull()
    .references(() => packages.id, { onDelete: "cascade" }),
  expiresAt: timestamp({ mode: "string" }).notNull(),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
});

export const packageLabelPhotoTokensRelations = relations(
  packageLabelPhotoTokens,
  ({ one }) => ({
    package: one(packages, {
      fields: [packageLabelPhotoTokens.packageId],
      references: [packages.id],
    }),
  }),
);

export const insertPackageLabelPhotoTokenSchema = createInsertSchema(
  packageLabelPhotoTokens,
);
export const selectPackageLabelPhotoTokenSchema = createSelectSchema(
  packageLabelPhotoTokens,
);

export type NewPackageLabelPhotoToken = z.infer<
  typeof insertPackageLabelPhotoTokenSchema
>;
export type PackageLabelPhotoToken = z.infer<
  typeof selectPackageLabelPhotoTokenSchema
>;

export default packageLabelPhotoTokens;
