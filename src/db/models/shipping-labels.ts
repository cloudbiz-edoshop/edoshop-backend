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

import { packages } from "./packages";
import { shippingPriorityCodes } from "./shipping-priority-codes";
import { shippingTypes } from "./shipping-types";
import { users } from "./users";

export const shippingLabels = pgTable("shipping_labels", {
  id: serial().primaryKey(),
  packageId: integer().references(() => packages.id).notNull(),
  shippingTypeId: integer().references(() => shippingTypes.id).notNull(),
  shippingPriorityCodeId: integer().references(() => shippingPriorityCodes.id).notNull(),
  netWeight: decimal({ precision: 10, scale: 2 }),
  purchasedBy: integer().references(() => users.id).notNull(),
  additionalNotes: varchar({ length: 255 }),
  customerFullName: varchar({ length: 255 }),
  address: varchar({ length: 255 }),
  country: varchar({ length: 255 }),
  city: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow(),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const shippingLabelsSchema = createSelectSchema(shippingLabels);
export type ShippingLabel = z.infer<typeof shippingLabelsSchema>;
export const insertShippingLabelSchema = createInsertSchema(shippingLabels);
export type NewShippingLabel = z.infer<typeof insertShippingLabelSchema>;

export const shippingLabelsRelations = relations(
  shippingLabels,
  ({ one }) => ({
    package: one(packages, {
      fields: [shippingLabels.packageId],
      references: [packages.id],
    }),
    shippingType: one(shippingTypes, {
      fields: [shippingLabels.shippingTypeId],
      references: [shippingTypes.id],
    }),
    shippingPriorityCode: one(shippingPriorityCodes, {
      fields: [shippingLabels.shippingPriorityCodeId],
      references: [shippingPriorityCodes.id],
    }),
    purchasedBy: one(users, {
      fields: [shippingLabels.purchasedBy],
      references: [users.id],
    }),
    createdBy: one(users, {
      fields: [shippingLabels.createdBy],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [shippingLabels.updatedBy],
      references: [users.id],
    }),
  }),
);

export default shippingLabels;
