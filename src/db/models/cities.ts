import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import countries from "./countries";

export const cities = pgTable("cities", {
  id: serial().primaryKey(),
  countryId: integer()
    .notNull()
    .references(() => countries.id),
  name: varchar({ length: 255 }).notNull(),
  countryCode: varchar({ length: 255 }).notNull(),
  stateCode: varchar({ length: 255 }).notNull(),
  latitude: varchar({ length: 255 }).notNull(),
  longitude: varchar({ length: 255 }).notNull(),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
});

// create relation between cities and countries
export const citiesRelations = relations(cities, ({ one }) => ({
  country: one(countries, {
    fields: [cities.countryId],
    references: [countries.id],
  }),
}));

// Select schema
export const selectCitiesSchema = createSelectSchema(cities);

export const listCitiesResponseSchema = z.array(selectCitiesSchema);

export type ListCitiesResponse = z.infer<typeof listCitiesResponseSchema>;

// Insert schema with enhanced validation
export const insertCitiesSchema = createInsertSchema(cities)
  .required({
    countryId: true,
    name: true,
    countryCode: true,
    stateCode: true,
    latitude: true,
    longitude: true,
  })
  .extend({
    countryId: z.number().int().positive(),
    name: z.string().max(255),
    countryCode: z.string().length(255),
    stateCode: z.string().max(255),
    latitude: z.string().max(255),
    longitude: z.string().max(255),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export default cities;
