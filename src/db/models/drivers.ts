import type { z } from "zod";

import { relations } from "drizzle-orm";
import {

  integer,
  pgTable,
  serial,

} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { users } from "./users";

export const drivers = pgTable("drivers", {
  id: serial().primaryKey(),
  userId: integer()
    .references(() => users.id)
    .unique()
    .notNull(),

});

export const driversSchema = createSelectSchema(drivers);
export type Driver = z.infer<typeof driversSchema>;
export const insertDriverSchema = createInsertSchema(drivers);
export type NewDriver = z.infer<typeof insertDriverSchema>;

export const driversRelations = relations(drivers, ({ one }) => ({
  user: one(users, {
    fields: [drivers.userId],
    references: [users.id],
    relationName: "driverUser",
  }),

}));

export default drivers;
