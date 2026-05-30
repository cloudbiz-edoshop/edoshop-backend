import type { AppRouteHandler } from "@/lib/types";
import type {
  CreateRoute,
  GetOneRoute,
  ListRoute,
  PatchRoute,
  RemoveRoute,
  RemoveSelectedRoute,
} from "@/modules/roles/roles.route";
import type {
  CreateRoleResponse,
  GetRoleResponse,
} from "@/modules/roles/roles.schema";

import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";
import { RoleService } from "@/modules/roles/roles.service";

// Create service instance
const roleService = new RoleService();

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  // Use role service for listing roles
  const result = await roleService.listRoles({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });

  const pagination = createPagination(result.total, page, limit);
  const rolesList: GetRoleResponse[] = result.data;
  const searchableFields: string[] = result.searchableFields;

  // Format response with pagination metadata
  const response = successResponseWithPagination(
    rolesList,
    pagination,
    searchableFields,
    "Roles retrieved successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const { name, description, permissions } = c.req.valid("json");
  const payload = c.get("accessTokenPayload");

  // Use role service to create the role
  const roleWithPermissions = await roleService.createRole({
    name,
    description,
    permissions,
    createdBy: payload.userId,
  });
  const typedResponse: CreateRoleResponse = roleWithPermissions;
  const response = successResponse(typedResponse, "Role created successfully");
  return c.json(response, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");

  // Use role service to get the role by ID
  const role = await roleService.getRole(id);
  const typedResponse: GetRoleResponse = role;

  const response = successResponse(
    typedResponse,
    "Role retrieved successfully",
  );

  return c.json(response, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const updateData = c.req.valid("json");
  const payload = c.get("accessTokenPayload");
  const updatedBy = payload.userId;
  const data = {
    ...updateData,
    id,
    updatedBy,
  };
  // Use role service to update the role
  const updatedRole = await roleService.updateRole(data);

  const response = successResponse(updatedRole, "Role updated successfully");
  return c.json(response, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const payload = c.get("accessTokenPayload");
  const deletedBy = payload.userId;

  // Use role service to delete the role
  await roleService.deleteRoles([id], deletedBy);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const removeSelected: AppRouteHandler<RemoveSelectedRoute> = async (
  c,
) => {
  const { ids } = c.req.valid("json");
  const payload = c.get("accessTokenPayload");
  const deletedBy = payload.userId;
  await roleService.deleteRoles(ids, deletedBy);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
