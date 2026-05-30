import type { z } from "zod";

import { relations } from "drizzle-orm";
import { integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { packages } from "./packages";
import { users } from "./users";

export const packageStatuses = pgTable("package_statuses", {
  id: serial().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer()
    .references(() => users.id)
    .notNull(),
  updatedBy: integer()
    .references(() => users.id)
    .notNull(),
});

export const packageStatusesSchema = createSelectSchema(packageStatuses);
export type PackageStatuses = z.infer<typeof packageStatusesSchema>;
export const createPackageStatusSchema = createInsertSchema(packageStatuses);
export type CreatePackageStatus = z.infer<typeof createPackageStatusSchema>;
export const updatePackageStatusSchema = createInsertSchema(packageStatuses);

export default packageStatuses;

export const packageStatusesRelations = relations(packageStatuses, ({ many }) => ({
  packages: many(packages),
}));
