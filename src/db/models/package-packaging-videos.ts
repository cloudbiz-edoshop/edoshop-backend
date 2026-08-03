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

import packages from "./packages";
import { users } from "./users";

export const packagePackagingVideos = pgTable("package_packaging_videos", {
  id: serial().primaryKey(),
  packageId: integer()
    .notNull()
    .references(() => packages.id, { onDelete: "cascade" }),
  videoUrl: varchar({ length: 1024 }).notNull(),
  durationSeconds: integer(),
  recordedBy: integer().references(() => users.id),
  recordedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  customerConfirmedAt: timestamp({ mode: "string" }),
  customerDisputeMessage: text(),
  customerRespondedAt: timestamp({ mode: "string" }),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
});

export const packagePackagingVideosSchema = createSelectSchema(packagePackagingVideos);
export type PackagePackagingVideos = z.infer<typeof packagePackagingVideosSchema>;
export const insertPackagePackagingVideosSchema = createInsertSchema(packagePackagingVideos);
export type NewPackagePackagingVideos = z.infer<typeof insertPackagePackagingVideosSchema>;

export const packagePackagingVideosRelations = relations(
  packagePackagingVideos,
  ({ one }) => ({
    package: one(packages, {
      fields: [packagePackagingVideos.packageId],
      references: [packages.id],
    }),
    recordedByUser: one(users, {
      fields: [packagePackagingVideos.recordedBy],
      references: [users.id],
    }),
  }),
);

export default packagePackagingVideos;
