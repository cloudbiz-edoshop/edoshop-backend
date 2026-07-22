import type { CreateUserResponseWithEmail } from "../users/users.schema";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/core/errors";
import {
  isProtectedRoleName,
  isSettingsEntity,
} from "@/constants/permissions.constants";
import { db } from "@/db";
import { isNextcloudAuthEnabled } from "@/lib/nextcloud-auth";
import { EmployeeRepository } from "@/modules/employees/employees.repository";
import { PermissionsService } from "@/modules/permissions/permissions.service";
import { RoleRepository } from "@/modules/roles/roles.repository";
import { UserRepository } from "@/modules/users/users.repository";

import { UsersService } from "@/modules/users/users.service";

import { RoleService } from "../roles/roles.service";

/**
 * Service for employee management
 */
export class EmployeeService {
  private readonly employeeRepository: EmployeeRepository;
  private readonly userRepository: UserRepository;
  private readonly usersService: UsersService;
  private readonly roleRepository: RoleRepository;
  private readonly roleService: RoleService;
  private readonly permissionsService: PermissionsService;
  /**
   * Create a new EmployeeService
   */
  constructor() {
    this.employeeRepository = new EmployeeRepository();
    this.userRepository = new UserRepository();
    this.usersService = new UsersService();
    this.roleRepository = new RoleRepository();
    this.roleService = new RoleService();
    this.permissionsService = new PermissionsService();
  }

  private async assertCanAssignRole(actorUserId: number, roleId: number) {
    const [actorAccess, role] = await Promise.all([
      this.permissionsService.getUserAccessProfile(actorUserId),
      this.roleRepository.findById(roleId),
    ]);

    if (!role) {
      throw new NotFoundError(`Role with ID ${roleId} not found`);
    }

    if (actorAccess.isSuperAdmin) {
      return role;
    }

    if (isProtectedRoleName(role.name)) {
      throw new ForbiddenError(
        "Only Super Admin can assign Admin or Super Admin roles",
      );
    }

    for (const permission of role.permissions ?? []) {
      if (isSettingsEntity(permission.entity.name)) {
        throw new ForbiddenError(
          "You cannot assign a role containing Settings permissions",
        );
      }

      if (
        !this.permissionsService.hasPermission(
          actorAccess,
          permission.entity.name,
          permission.operation.name,
        )
      ) {
        throw new ForbiddenError(
          "You cannot assign a role with permissions you do not have",
        );
      }
    }

    return role;
  }

  /**
   * List employees with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters to apply
   * @returns List of employees and total count
   */
  async listEmployees(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    const standaloneAdmins = await this.userRepository.listStandaloneAdminUsers(
      params.search,
    );
    const adminRows = standaloneAdmins.map((user) => ({
      id: -user.id,
      userId: user.id,
      employeeCode: "SUPER-ADMIN",
      isActive: user.isActive,
      roleExpiresAt: null,
      isSuperAdminMember: true,
      user,
      role: {
        id: 0,
        name: "super_admin",
        description: "Super Admin",
        permissions: [],
      },
    }));

    const employees = await this.employeeRepository.list(params);
    const formattedEmployees = employees.data.map((employee) => ({
      ...employee,
      role: this.roleService.formatRoleWithPermissions(employee.role),
    }));

    const combined = [...adminRows, ...formattedEmployees];
    const total = adminRows.length + employees.total;
    const start = (params.page - 1) * params.limit;
    const end = start + params.limit;

    return {
      ...employees,
      data: combined.slice(start, end),
      total,
    };
  }

  /**
   * Get an employee by ID
   *
   * @param id - Employee ID
   * @returns Employee details
   * @throws NotFoundError if employee is not found
   */
  async getEmployee(id: number) {
    const employee = await this.employeeRepository.findById(id);

    if (!employee) {
      throw new NotFoundError(`Employee with ID ${id} not found`);
    }

    const role = employee.role ?? null;

    const formattedRole = role
      ? this.roleService.formatRoleWithPermissions(role)
      : null;

    return {
      ...employee,
      role: formattedRole,
    };
  }

  async getEmployeeByUserId(userId: number) {
    return await this.employeeRepository.findByUserId(userId);
  }

  /**
   * Create a new employee
   *
   * @param data - Employee and user data
   * @param data.email - Email address
   * @param data.fullName - Full name
   * @param data.username - Username
   * @param data.password - Password
   * @param data.roleId - Role ID
   * @param data.isTempRole - If the role is temporary
   * @param data.roleExpiresAfter - Number of days the role will expire after
   * @param data.createdBy - ID of the user who created the employee
   * @returns Created employee
   */
  async createEmployee(data: {
    email: string;
    fullName: string;
    username: string;
    password?: string;
    roleId: number;
    isTempRole?: boolean;
    roleExpiresAfter?: number;
    createdBy: number;
  }) {
    const {
      email,
      fullName,
      username,
      password,
      createdBy,
      roleId,
      isTempRole,
      roleExpiresAfter,
    } = data;

    // Calculate role expiry if it's a temporary role
    let roleExpiresAt: string | null = null;
    if (isTempRole && roleExpiresAfter) {
      roleExpiresAt = new Date(
        Date.now() + roleExpiresAfter * 24 * 60 * 60 * 1000,
      ).toISOString();
    }

    const role = await this.assertCanAssignRole(createdBy, roleId);

    if (!password && !isNextcloudAuthEnabled()) {
      throw new ValidationError("Password is required");
    }

    // Check if employee already exists with this email
    const existingEmployee = await this.employeeRepository.findByEmail(email);
    if (existingEmployee) {
      throw new ConflictError(`Employee with email ${email} already exists`);
    }

    // check if username already exists
    const existingUsername = await this.userRepository.findByUsername(username);
    if (existingUsername) {
      throw new ConflictError(`Username ${username} already exists`);
    }

    // check if email already exists
    const userOrNull = await this.userRepository.findByEmail(email);
    let user: CreateUserResponseWithEmail | typeof userOrNull | null = null;

    // Use a transaction to ensure atomicity between user and employee creation
    const result = await db.transaction(async (tx) => {
      // Create user if it doesn't exist - using transaction
      if (!userOrNull) {
        user = await this.usersService.createUserWithEmailInTransaction(tx, {
          email,
          fullName,
          username,
          password: password || undefined,
        });
      } else {
        user = userOrNull;
      }

      // Create employee with user - using transaction
      const createdEmployee =
        await this.employeeRepository.createWithTransaction(tx, {
          userId: user.id,
          roleId,
          roleExpiresAt,
          createdBy,
        });

      return createdEmployee;
    });

    // If we reach here, both operations succeeded
    const roleWithPermissions =
      await this.roleService.formatRoleWithPermissions(role);

    return {
      ...result,
      role: roleWithPermissions,
    };
  }

  /**
   * Update an employee
   *
   * @param data - Employee data
   * @param data.id - Employee ID
   * @param data.updatedBy - Last modified by user ID
   * @param data.email - Email address
   * @param data.fullName - Full name
   * @param data.username - Username
   * @param data.password - Password
   * @param data.roleId - Role ID
   * @param data.isTempRole - If the role is temporary
   * @param data.roleExpiresAfter - Number of days the role will expire after
   * @returns Updated employee
   * @throws NotFoundError if employee is not found
   * @throws ValidationError if role is not found
   * @throws ConflictError if employee already exists with this email
   */
  async updateEmployee(data: {
    id: number;
    updatedBy: number;
    email?: string;
    fullName?: string;
    username?: string;
    password?: string;
    roleId?: number;
    isTempRole?: boolean;
    roleExpiresAfter?: number;
  }) {
    const {
      id,
      updatedBy,
      email,
      fullName,
      username,
      password,
      roleId,
      isTempRole,
      roleExpiresAfter,
    } = data;

    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundError(`Employee with ID ${id} not found`);
    }

    // Check if role exists
    if (roleId) {
      await this.assertCanAssignRole(updatedBy, roleId);
    }

    // Calculate role expiry if it's a temporary role
    let roleExpiresAt: string | null = null;
    if (isTempRole && roleExpiresAfter) {
      roleExpiresAt = new Date(
        Date.now() + roleExpiresAfter * 24 * 60 * 60 * 1000,
      ).toISOString();
    }

    // Check if employee already exists with this email
    if (email && email !== employee.user.email) {
      const existingEmployee = await this.employeeRepository.findByEmail(email);
      if (existingEmployee) {
        throw new ConflictError("Employee already exists with this email");
      }
    }

    // Use a transaction to ensure atomicity between user and employee update
    await db.transaction(async (tx) => {
      // Update user - using transaction
      await this.usersService.updateUserWithEmailInTransaction(
        tx,
        employee.userId,
        {
          email,
          fullName,
          username,
          password,
          updatedBy,
          updatedAt: new Date().toISOString(),
        },
      );

      // Update employee - using transaction
      await this.employeeRepository.updateWithTransaction(tx, id, {
        updatedBy,
        userId: employee.userId,
        roleId,
        roleExpiresAt,
      });
    });

    // fetch the updated employee
    const updatedEmployee = await this.getEmployee(id);

    return updatedEmployee;
  }

  /**
   * Delete an employee
   *
   * @param id - Employee ID
   * @param deletedBy - Deleted by user ID
   * @returns Deleted employee
   * @throws NotFoundError if employee is not found
   */
  async deleteEmployee(id: number, deletedBy: number) {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundError(`Employee with ID ${id} not found`);
    }

    // Use a transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      return await this.employeeRepository.softDelete(tx, id, deletedBy);
    });

    return result;
  }

  /**
   * Delete multiple employees
   *
   * @param ids - Array of employee IDs
   * @param deletedBy - Deleted by user ID
   * @returns Deleted employees
   * @throws NotFoundError if employees are not found
   */
  async deleteEmployees(ids: number[], deletedBy: number) {
    // Use a transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      const deletedEmployees = await this.employeeRepository.softDeleteMany(
        tx,
        ids,
        deletedBy,
      );
      if (deletedEmployees.length === 0) {
        throw new NotFoundError(
          `Employees with IDs ${ids.join(", ")} not found`,
        );
      }
      return deletedEmployees;
    });

    return result;
  }
}
