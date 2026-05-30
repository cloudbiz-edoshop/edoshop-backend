import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";

import paymentMethods from "./payment-methods";
import paymentTypes from "./payment-types";
import { users } from "./users";

export const paymentMethodTypes = pgTable(
  "payment_method_types",
  {
    id: serial().primaryKey(),
    paymentMethodId: integer().references(() => paymentMethods.id),
    paymentTypeId: integer().references(() => paymentTypes.id),
    isActive: boolean().notNull().default(true),
    createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
    createdBy: integer()
      .references(() => users.id)
      .notNull(),
    updatedBy: integer()
      .references(() => users.id)
      .notNull(),
  },
  (t) => [
    unique("payment_method_types_pk").on(t.paymentMethodId, t.paymentTypeId),
  ],
);

export const paymentMethodTypesSchema = createSelectSchema(paymentMethodTypes);

export type PaymentMethodTypes = z.infer<typeof paymentMethodTypesSchema>;

export default paymentMethodTypes;

export const paymentMethodTypesRelations = relations(
  paymentMethodTypes,
  ({ one }) => ({
    paymentMethod: one(paymentMethods, {
      fields: [paymentMethodTypes.paymentMethodId],
      references: [paymentMethods.id],
    }),
    paymentType: one(paymentTypes, {
      fields: [paymentMethodTypes.paymentTypeId],
      references: [paymentTypes.id],
    }),
    createdBy: one(users, {
      fields: [paymentMethodTypes.createdBy],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [paymentMethodTypes.updatedBy],
      references: [users.id],
    }),
  }),
);
