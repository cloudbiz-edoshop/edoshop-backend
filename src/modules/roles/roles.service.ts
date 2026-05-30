import type { CreateRoleResponse } from "./roles.schema";
import { ConflictError, NotFoundError, ValidationError } from "@/core/errors";
import db from "@/db";
import { EntityRepository } from "@/modules/entities/entities.repository";
import { OperationRepository } from "@/modules/operations/operations.repository";

import { RoleRepository } from "@/modules/roles/roles.repository";

/**
 * Service for role management operations
 */
export class RoleService {
  private readonly roleRepository: RoleRepository;
  private readonly entityRepository: EntityRepository;
  private readonly operationRepository: OperationRepository;

  /**
   * Create a new RoleService
   */
  constructor() {
    this.roleRepository = new RoleRepository();
    this.entityRepository = new EntityRepository();
    this.operationRepository = new OperationRepository();
  }

  /**
   * List roles with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters to apply
   * @returns List of roles and total count
   */
  async listRoles(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    const rolesWithCount = await this.roleRepository.list(params);
    const rolesWithPermissions = this.formatRolesWithPermissions(
      rolesWithCount.data,
    );
    return {
      data: rolesWithPermissions,
      total: rolesWithCount.total,
      searchableFields: rolesWithCount.searchableFields,
    };
  }

  /**
   * Get a role by ID
   *
   * @param id - Role ID
   * @returns Role with permissions
   * @throws NotFoundError if role is not found
   */
  async getRole(id: number) {
    const role = await this.roleRepository.findById(id);

    if (!role) {
      throw new NotFoundError(`Role with ID ${id} not found`);
    }

    const formattedRole = this.formatRoleWithPermissions(role);

    const processedPermissions = formattedRole.permissions;

    return { ...role, processedPermissions };
  }

  /**
   * Create a new role with permissions
   *
   * @param data - Role data with permissions
   * @param data.name - Role name
   * @param data.description - Role description
   * @param data.permissions - Permissions
   * @param data.createdBy - User ID of the creator
   * @returns Created role with permissions
   */
  async createRole(data: {
    name: string;
    description?: string;
    permissions?: { entityId: number; operationId: number }[];
    createdBy: number;
  }): Promise<CreateRoleResponse> {
    const { permissions, ...roleData } = data;

    const role = await this.roleRepository.findByName(roleData.name);
    if (role) {
      throw new ConflictError(
        `Role already exists with this name: ${roleData.name}`,
      );
    }

    // Check if entity and operation exist for each permission
    if (permissions && permissions.length > 0) {
      for (const permission of permissions) {
        const entity = await this.entityRepository.findById(
          permission.entityId,
        );
        if (!entity) {
          throw new ValidationError(
            `Entity with ID ${permission.entityId} not found`,
          );
        }

        const operation = await this.operationRepository.findById(
          permission.operationId,
        );
        if (!operation) {
          throw new ValidationError(
            `Operation with ID ${permission.operationId} not found`,
          );
        }
      }
    }

    const createdRoleWithPermissions = await this.roleRepository.create(
      roleData,
      permissions,
    );

    return this.formatRoleWithPermissions(createdRoleWithPermissions);
  }

  /**
   * Update a role with permissions
   *
   * @param data - Role data with permissions
   * @param data.id - Role ID
   * @param data.name - Role name
   * @param data.description - Role description
   * @param data.permissions - Permissions
   * @param data.updatedBy - User ID of the last modifier
   * @returns Updated role with permissions
   * @throws NotFoundError if role is not found
   */
  async updateRole({
    id,
    name,
    description,
    permissions,
    updatedBy,
  }: {
    id: number;
    name: string;
    description?: string;
    permissions?: { entityId: number; operationId: number }[];
    updatedBy: number;
  }) {
    // Check if role exists
    const existingRole = await this.roleRepository.findById(id);
    if (!existingRole) {
      throw new NotFoundError(`Role with ID ${id} not found`);
    }
    if (existingRole.name !== name) {
      const role = await this.roleRepository.findByName(name);
      if (role) {
        throw new ConflictError(`Role already exists with this name: ${name}`);
      }
    }
    // Check if entity and operation exist for each permission
    if (permissions && permissions.length > 0) {
      for (const permission of permissions) {
        const entity = await this.entityRepository.findById(
          permission.entityId,
        );
        if (!entity) {
          throw new ValidationError(
            `Entity with ID ${permission.entityId} not found`,
          );
        }
        const operation = await this.operationRepository.findById(
          permission.operationId,
        );
        if (!operation) {
          throw new ValidationError(
            `Operation with ID ${permission.operationId} not found`,
          );
        }
      }
    }
    const updatedRole = await this.roleRepository.update(
      { id, name, description, updatedBy },
      permissions,
    );
    return this.formatRoleWithPermissions(updatedRole);
  }

  /**
   * Delete multiple Roles
   *
   * @param ids - Array of Role IDs
   * @param deletedBy - ID of the user performing the deletion
   * @returns Deleted roles
   * @throws NotFoundError if roles are not found
   */
  async deleteRoles(ids: number[], deletedBy: number) {
    // Use a transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      const deletedRoles = await this.roleRepository.deleteMany(
        tx,
        ids,
        deletedBy,
      );
      if (deletedRoles.length === 0) {
        throw new NotFoundError(`Roles with IDs ${ids.join(", ")} not found`);
      }
      return deletedRoles;
    });

    return result;
  }

  /**
   * Format role permissions for response
   *
   * @param role - Role with permissions
   * @returns Role with formatted permissions
   */
  formatRoleWithPermissions(role: any) {
    return {
      ...role,
      processedPermissions: role?.permissions?.map(
        (permission: any) =>
          `${permission?.entity?.name}:${permission?.operation?.name}`,
      ),
    };
  }

  /**
   * Format roles permissions for response
   *
   * @param roles - Roles with permissions
   * @returns Roles with formatted permissions
   */
  formatRolesWithPermissions(roles: any[]) {
    return roles.map((role) => this.formatRoleWithPermissions(role));
  }
}
