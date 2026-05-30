import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";

import entities from "./entities";
import operations from "./operations";
import roles from "./roles";

export const permissions = pgTable(
  "permissions",
  {
    id: serial().primaryKey(),
    roleId: integer()
      .references(() => roles.id)
      .notNull(),
    entityId: integer()
      .references(() => entities.id)
      .notNull(),
    operationId: integer()
      .references(() => operations.id)
      .notNull(),
    createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("unique_permission").on(t.roleId, t.entityId, t.operationId),
  ],
);

export const permissionsRelations = relations(permissions, ({ one }) => ({
  role: one(roles, {
    fields: [permissions.roleId],
    references: [roles.id],
  }),
  entity: one(entities, {
    fields: [permissions.entityId],
    references: [entities.id],
  }),
  operation: one(operations, {
    fields: [permissions.operationId],
    references: [operations.id],
  }),
}));

export const permissionsSchema = createSelectSchema(permissions);

export default permissions;
