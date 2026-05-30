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

import { constraintAndMessages } from "@/constants";

import permissions from "./permissions";

export const entities = pgTable("entities", {
  id: serial().primaryKey(),
  name: varchar({ length: constraintAndMessages.ENTITY.NAME_MAX_LENGTH })
    .notNull()
    .unique(),
  description: varchar({
    length: constraintAndMessages.DESCRIPTION.MAX_LENGTH,
  }),
  createdBy: integer(),
  updatedBy: integer(),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
});

export const entitiesRelations = relations(entities, ({ many }) => ({
  permissions: many(permissions),
}));

// Select schema
export const selectEntitiesSchema = createSelectSchema(entities);

// Insert schema with enhanced validation
export const insertEntitiesSchema = createInsertSchema(entities)
  .required({
    name: true,
  })
  .extend({
    name: z
      .string()
      .trim()
      .min(
        constraintAndMessages.ENTITY.NAME_MIN_LENGTH,
        constraintAndMessages.ENTITY.NAME_MIN_LENGTH_ERROR,
      )
      .max(
        constraintAndMessages.ENTITY.NAME_MAX_LENGTH,
        constraintAndMessages.ENTITY.NAME_MAX_LENGTH_ERROR,
      )
      .openapi({
        example: "user",
      }),
    description: z
      .string()
      .trim()
      .max(
        constraintAndMessages.DESCRIPTION.MAX_LENGTH,
        constraintAndMessages.DESCRIPTION.MAX_LENGTH_ERROR,
      )
      .optional()
      .openapi({
        example: "User entity that represents system users",
      }),
    createdBy: z.number().int().positive().optional().nullable(),
    updatedBy: z.number().int().positive().optional().nullable(),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

// Patch schema for partial updates
export const patchEntitiesSchema = insertEntitiesSchema.partial();

export default entities;
