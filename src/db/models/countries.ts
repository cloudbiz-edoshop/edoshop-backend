import { relations } from "drizzle-orm";
import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import cities from "./cities";

export const countries = pgTable("countries", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull().unique(),
  isoCode: varchar({ length: 255 }).notNull().unique(),
  flag: varchar({ length: 255 }).notNull().unique(),
  phonecode: varchar({ length: 255 }).notNull(),
  currency: varchar({ length: 255 }).notNull(),
  latitude: varchar({ length: 255 }).notNull(),
  longitude: varchar({ length: 255 }).notNull(),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
});

// create relation between countries and cities
export const countriesRelations = relations(countries, ({ many }) => ({
  cities: many(cities),
}));

// Select schema
export const selectCountriesSchema = createSelectSchema(countries);

export const listCountriesResponseSchema = z.array(selectCountriesSchema);

export type ListCountriesResponse = z.infer<typeof listCountriesResponseSchema>;

// Insert schema with enhanced validation
export const insertCountriesSchema = createInsertSchema(countries)
  .required({
    name: true,
    isoCode: true,
    flag: true,
    phonecode: true,
    currency: true,
    latitude: true,
    longitude: true,
  })
  .extend({
    name: z.string().max(255),
    isoCode: z.string().length(255),
    flag: z.string().max(255),
    phonecode: z.string().max(255),
    currency: z.string().length(255),
    latitude: z.string().max(255),
    longitude: z.string().max(255),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export default countries;
