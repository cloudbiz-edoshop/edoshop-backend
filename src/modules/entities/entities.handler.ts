import type { ListEntitiesResponse } from "./entities.schema";
import type { AppRouteHandler } from "@/lib/types";

import type {
  CreateRoute,
  GetOneRoute,
  ListRoute,
  PatchRoute,
  RemoveRoute,
} from "@/modules/entities/entities.route";
import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { EntityService } from "@/modules/entities/entities.service";

// Create service instance
const entityService = new EntityService();

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  // Use entity service for listing entities
  const result = await entityService.listEntities({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });

  const pagination = createPagination(result.total, page, limit);
  const entitiesList: ListEntitiesResponse = result.data;
  const searchableFields: string[] = result.searchableFields;

  // Format response with pagination metadata
  const response = successResponseWithPagination(
    entitiesList,
    pagination,
    searchableFields,
    "Entities retrieved successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const entityData = c.req.valid("json");

  // Use entity service to create the entity
  const entity = await entityService.createEntity(entityData);

  const response = successResponse(entity, "Entity created successfully");
  return c.json(response, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");

  // Use entity service to get the entity by ID
  const entity = await entityService.getEntity(id);

  const response = successResponse(entity, "Entity retrieved successfully");
  return c.json(response, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const updateData = c.req.valid("json");

  // Use entity service to update the entity
  const updatedEntity = await entityService.updateEntity(id, updateData);

  const response = successResponse(
    updatedEntity,
    "Entity updated successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");

  // Use entity service to delete the entity
  await entityService.deleteEntity(id);

  const response = successResponse({ id }, "Entity deleted successfully");
  return c.json(response, HttpStatusCodes.OK);
};
