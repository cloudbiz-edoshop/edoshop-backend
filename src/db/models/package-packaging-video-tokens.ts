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

/** Short-lived tokens for phone packaging video capture (no login). */
export const packagePackagingVideoTokens = pgTable(
  "package_packaging_video_tokens",
  {
    id: serial().primaryKey(),
    token: varchar({ length: 128 }).notNull().unique(),
    packageId: integer()
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    expiresAt: timestamp({ mode: "string" }).notNull(),
    createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  },
);

export const packagePackagingVideoTokensRelations = relations(
  packagePackagingVideoTokens,
  ({ one }) => ({
    package: one(packages, {
      fields: [packagePackagingVideoTokens.packageId],
      references: [packages.id],
    }),
  }),
);

export const insertPackagePackagingVideoTokenSchema = createInsertSchema(
  packagePackagingVideoTokens,
);
export const selectPackagePackagingVideoTokenSchema = createSelectSchema(
  packagePackagingVideoTokens,
);

export type NewPackagePackagingVideoToken = z.infer<
  typeof insertPackagePackagingVideoTokenSchema
>;
export type PackagePackagingVideoToken = z.infer<
  typeof selectPackagePackagingVideoTokenSchema
>;

export default packagePackagingVideoTokens;
