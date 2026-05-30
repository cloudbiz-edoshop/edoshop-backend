import type { MiddlewareHandler } from "hono";

import type { AppContext } from "@/lib/types";

import { HTTPException } from "hono/http-exception";

import * as HttpStatusCodes from "@/lib/http-status-codes";
import { EmployeeService } from "@/modules/employees/employees.service";
import { RoleService } from "@/modules/roles/roles.service";

/**
 * Permission object interface for checking roles and permissions
 */
export interface Permission {
  entity: string;
  operation: string;
}

/**
 * Type for permission check strategy
 */
export type PermissionCheckType = "ANY" | "ALL";

/**
 * Middleware for checking roles and permissions
 *
 * @param permissions - Array of permission objects to check access for
 * @param checkType - Determines if ANY permission is sufficient or ALL permissions are required ("ANY" | "ALL"), defaults to "ALL"
 * @returns A middleware function that checks if the user has the specified permissions
 */
export const rolesAndPermissionsMiddleware = (
  permissions: Permission[],
  checkType: PermissionCheckType = "ALL",
): MiddlewareHandler => {
  return async (c: AppContext, next) => {
    const user = c.get("user");
    const isAdmin = user.isAdmin;
    const employeeService = new EmployeeService();
    const roleService = new RoleService();

    const path = c.req.path;
    const method = c.req.method;
    c.var.logger.info(
      `Checking permissions for ${path} ${method} with permissions: ${JSON.stringify(permissions)}, checkType: ${checkType}`,
    );

    if (isAdmin) {
      return next();
    }

    // check if user is an employee
    const employee = await employeeService.getEmployeeByUserId(user.id);
    if (!employee) {
      throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
        message: "User is not an employee",
      });
    }
    c.var.logger.info(`Employee: ${JSON.stringify(employee)}`);
    if (!employee.roleId) {
      throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
        message: "Employee has no role",
      });
    }

    const roleWithPermissions = await roleService.getRole(employee.roleId);

    c.var.logger.info(
      `Role with permissions: ${JSON.stringify(roleWithPermissions)}`,
    );

    if (roleWithPermissions.permissions.length === 0) {
      c.var.logger.error("Employee has no permissions");
      throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
        message: "Employee has no permissions",
      });
    }

    let hasPermission = false;

    if (checkType === "ALL") {
      // Check if user has ALL of the required permissions
      hasPermission = permissions.every(({ entity, operation }) => {
        return roleWithPermissions.permissions.some(
          (permission) =>
            permission.entity.name === entity &&
            permission.operation.name === operation,
        );
      });
    } else {
      // Check if user has ANY of the required permissions (default)
      hasPermission = permissions.some(({ entity, operation }) => {
        return roleWithPermissions.permissions.some(
          (permission) =>
            permission.entity.name === entity &&
            permission.operation.name === operation,
        );
      });
    }

    if (!hasPermission) {
      c.var.logger.info(
        `Permission denied for ${path} ${method} with permissions: ${JSON.stringify(permissions)}, checkType: ${checkType}`,
      );
      throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
        message:
          checkType === "ALL"
            ? "Employee is missing one or more required permissions for this resource"
            : "Employee is not authorized to access this resource",
      });
    }

    c.var.logger.info(`Permission granted for ${path} ${method}`);

    return next();
  };
};
