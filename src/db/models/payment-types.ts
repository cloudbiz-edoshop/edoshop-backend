import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";

import paymentMethodTypes from "./payment-method-types";
import { users } from "./users";

export const paymentTypes = pgTable("payment_types", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull().unique(),
  description: varchar({ length: 255 }),
  isActive: boolean().notNull().default(true),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer()
    .references(() => users.id)
    .notNull(),
  updatedBy: integer()
    .references(() => users.id)
    .notNull(),
});

export const paymentTypesSchema = createSelectSchema(paymentTypes);

export type PaymentTypes = z.infer<typeof paymentTypesSchema>;

export default paymentTypes;

export const paymentTypesRelations = relations(
  paymentTypes,
  ({ one, many }) => ({
    createdBy: one(users, {
      fields: [paymentTypes.createdBy],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [paymentTypes.updatedBy],
      references: [users.id],
    }),
    paymentMethodTypes: many(paymentMethodTypes),
  }),
);
