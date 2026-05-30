import type { z } from "zod";

import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";

import { users } from "./users";

export const entryStates = pgTable("entry_states", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull().unique(), // 'New, Return'
  description: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const entryStateSchema = createSelectSchema(entryStates);

export type EntryState = z.infer<typeof entryStateSchema>;

export default entryStates;
