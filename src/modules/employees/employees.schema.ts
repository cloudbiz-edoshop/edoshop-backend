import { z } from "zod";

import { employeeSchema } from "@/db/models/employees";
import {
  emailSchema,
  fullNameSchema,
  idSchema,
  passwordSchema,
  profilePhotoUrlSchema,
  usernameSchema,
} from "@/lib/zod-schemas";
import { getRoleResponseSchema } from "@/modules/roles/roles.schema";
import { userSchema } from "@/modules/users/users.schema";

// Schema for creating a new employee
// Base schema without refinement
const baseEmployeeSchema = z.object({
  email: emailSchema,
  fullName: fullNameSchema,
  username: usernameSchema,
  password: passwordSchema,
  profilePhotoUrl: profilePhotoUrlSchema.optional(),
  roleId: idSchema.describe("ID of the employee's role"),
  isTempRole: z.boolean().optional().describe("If the role is temporary"),
  roleExpiresAfter: z
    .number()
    .min(1)
    .optional()
    .describe("Number of days the role will expire after"),
  employeeCode: z
    .string()
    .optional()
    .describe(
      "Employee code (optional, will be auto-generated as 'EMP-{id}' if not provided)",
    ),
});

// Schema for creating a new employee
export const createEmployeeRequestSchema = baseEmployeeSchema
  .omit({
    employeeCode: true,
  })
  .refine(
    (data) => {
      if (data.isTempRole && !data.roleExpiresAfter) {
        return false;
      }
      return true;
    },
    {
      path: ["roleExpiresAfter"],
      message: "Role expires after is required if isTempRole is true",
    },
  );

// Schema for updating an employee
export const updateEmployeeRequestSchema = baseEmployeeSchema
  .omit({
    employeeCode: true,
  })
  .partial()
  .refine(
    (data) => {
      if (data.isTempRole && !data.roleExpiresAfter) {
        return false;
      }
      return true;
    },
    {
      path: ["roleExpiresAfter"],
      message: "Role expires after is required if isTempRole is true",
    },
  );

// Create employee request type
export type CreateEmployeeRequest = z.infer<typeof createEmployeeRequestSchema>;

// Create employee response schema
export const createEmployeeResponseSchema = employeeSchema.extend({
  user: userSchema,
  role: getRoleResponseSchema.nullable(),
});

// Create employee response type
export type CreateEmployeeResponse = z.infer<
  typeof createEmployeeResponseSchema
>;

// Update employee request type
export type UpdateEmployeeRequest = z.infer<typeof updateEmployeeRequestSchema>;

// Schema for updating an employee
export const updateEmployeeResponseSchema = z.object({
  ...employeeSchema.shape,
  user: userSchema,
  role: getRoleResponseSchema.nullable(),
});

// Update employee response type
export type UpdateEmployeeResponse = z.infer<
  typeof updateEmployeeResponseSchema
>;

// Schema for getting an employee
export const getEmployeeResponseSchema = employeeSchema.extend({
  user: userSchema,
  role: getRoleResponseSchema.nullable(),
});

// Get employee response type
export type GetEmployeeResponse = z.infer<typeof getEmployeeResponseSchema>;

// List employees response schema
export const listEmployeesResponseSchema = z.array(getEmployeeResponseSchema);

// List employees response type
export type ListEmployeesResponse = z.infer<typeof listEmployeesResponseSchema>;
