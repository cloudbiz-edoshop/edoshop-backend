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

export const entryTypes = pgTable("entry_types", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull().unique(), // 'Bundle, Series, Item, Package'
  description: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const entryTypeSchema = createSelectSchema(entryTypes);

export type EntryType = z.infer<typeof entryTypeSchema>;

export default entryTypes;
