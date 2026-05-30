import { relations } from "drizzle-orm";
import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { constraintAndMessages, OperationType } from "@/constants";

import permissions from "./permissions";

export const operations = pgTable("operations", {
  id: serial().primaryKey(),
  name: varchar({ length: 50 }).notNull(),
  description: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
});

export const operationsRelations = relations(operations, ({ many }) => ({
  permissions: many(permissions),
}));

// Select schema
export const selectOperationsSchema = createSelectSchema(operations);

// Insert schema with enhanced validation
export const insertOperationsSchema = createInsertSchema(operations)
  .required({
    name: true,
  })
  .extend({
    name: z
      .enum(Object.values(OperationType) as [string, ...string[]], {
        message: constraintAndMessages.OPERATION.INVALID_ERROR,
      })
      .openapi({
        example: OperationType.READ,
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
        example: "Permission to read user data",
      }),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

// Patch schema for partial updates
export const patchOperationsSchema = insertOperationsSchema.partial();

export default operations;
