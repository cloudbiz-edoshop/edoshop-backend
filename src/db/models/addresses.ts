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
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import addressTypes from "./address-types";
import cities from "./cities";
import countries from "./countries";
import { orders } from "./orders";
import { users } from "./users";

export const addresses = pgTable("addresses", {
  id: serial().primaryKey(),
  userId: integer().references(() => users.id),
  addressTypeId: integer()
    .references(() => addressTypes.id)
    .notNull(),
  streetAddress: varchar({ length: 255 }).notNull(),
  countryId: integer()
    .references(() => countries.id)
    .notNull(),
  cityId: integer().references(() => cities.id),
  stateProvince: varchar({ length: 100 }),
  postalCode: varchar({ length: 20 }),
  landmark: varchar({ length: 255 }),
  isDefault: boolean().notNull().default(false),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer()
    .references(() => users.id)
    .notNull(),
  updatedBy: integer()
    .references(() => users.id)
    .notNull(),
});

export const addressesSchema = createSelectSchema(addresses);

export type Addresses = z.infer<typeof addressesSchema>;

export const createAddressSchema = createInsertSchema(addresses);
export type CreateAddress = z.infer<typeof createAddressSchema>;

export const updateAddressSchema = createInsertSchema(addresses)
  .omit({
    id: true,
    userId: true,
    createdAt: true,
    createdBy: true,
  })
  .partial();
export type UpdateAddress = z.infer<typeof updateAddressSchema>;

export default addresses;

export const addressesRelations = relations(addresses, ({ one, many }) => ({
  shippingAddress: many(orders, { relationName: "shippingAddress" }),
  billingAddress: many(orders, { relationName: "billingAddress" }),

  addressType: one(addressTypes, {
    fields: [addresses.addressTypeId],
    references: [addressTypes.id],
  }),
  country: one(countries, {
    fields: [addresses.countryId],
    references: [countries.id],
  }),
  city: one(cities, {
    fields: [addresses.cityId],
    references: [cities.id],
  }),
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
    relationName: "userAddresses",
  }),
  createdBy: one(users, {
    fields: [addresses.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [addresses.updatedBy],
    references: [users.id],
  }),
}));
