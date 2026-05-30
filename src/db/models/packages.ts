import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  decimal,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { entries } from "./entries";
import { packageItems } from "./package-items";
import { packageStatuses } from "./package-statuses";
import { shippingLabels } from "./shipping-labels";
import { users } from "./users";

export const packages = pgTable("packages", {
  id: serial().primaryKey(),
  entryId: integer()
    .notNull()
    .references(() => entries.id),
  packageCode: varchar({ length: 255 }).unique().notNull(),
  binLocation: varchar({ length: 255 }),
  packageStatusId: integer().notNull().references(() => packageStatuses.id),
  lastPackedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer().references(() => users.id).notNull(),
  updatedBy: integer().references(() => users.id).notNull(),
  hasShippingLabel: integer().notNull().default(0),
  receivedAt: timestamp({ mode: "string" }),
  packageWeightAtReceived: decimal({ precision: 10, scale: 2 }),
  binLocationAtReceived: varchar({ length: 255 }),
  packageDestinationAtReceived: varchar({ length: 255 }),
  address: varchar({ length: 500 }),
});

export const packagesSchema = createSelectSchema(packages);
export type Packages = z.infer<typeof packagesSchema>;
export const insertPackagesSchema = createInsertSchema(packages);
export type NewPackages = z.infer<typeof insertPackagesSchema>;

export const packagesRelations = relations(packages, ({ one, many }) => ({
  entry: one(entries, { fields: [packages.entryId], references: [entries.id] }),
  createdBy: one(users, {
    fields: [packages.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [packages.updatedBy],
    references: [users.id],
  }),
  packageStatus: one(packageStatuses, {
    fields: [packages.packageStatusId],
    references: [packageStatuses.id],
  }),
  packageItems: many(packageItems),
  shippingLabel: one(shippingLabels, {
    fields: [packages.id],
    references: [shippingLabels.packageId],
  }),
}));

export default packages;
