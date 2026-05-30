import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";

import addresses from "./addresses";
import { users } from "./users";

export const addressTypes = pgTable("address_types", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull().unique(),
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

export const addressTypesSchema = createSelectSchema(addressTypes);

export type AddressTypes = z.infer<typeof addressTypesSchema>;

export default addressTypes;

export const addressTypesRelations = relations(
  addressTypes,
  ({ one, many }) => ({
    addresses: many(addresses),
    createdBy: one(users, {
      fields: [addressTypes.createdBy],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [addressTypes.updatedBy],
      references: [users.id],
    }),
  }),
);
