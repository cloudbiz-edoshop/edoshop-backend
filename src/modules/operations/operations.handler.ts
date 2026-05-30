import type { Operation } from "./operations.schema";
import type { AppRouteHandler } from "@/lib/types";

import type {
  CreateRoute,
  GetOneRoute,
  ListRoute,
  PatchRoute,
  RemoveRoute,
} from "@/modules/operations/operations.route";
import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { OperationService } from "@/modules/operations/operations.service";

// Create service instance
const operationService = new OperationService();

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  // Use operation service for listing operations
  const result = await operationService.listOperations({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });

  const pagination = createPagination(result.total, page, limit);
  const operationsList: Operation[] = result.data;
  const searchableFields: string[] = result.searchableFields;

  const response = successResponseWithPagination(
    operationsList,
    pagination,
    searchableFields,
    "Operations retrieved successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const operationData = c.req.valid("json");

  // Use operation service to create the operation
  const operation = await operationService.createOperation(operationData);

  const response = successResponse(operation, "Operation created successfully");
  return c.json(response, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  // Use operation service to get the operation by ID
  const operation = await operationService.getOperation(id);

  const response = successResponse(
    operation,
    "Operation retrieved successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const updateData = c.req.valid("json");

  // Use operation service to update the operation
  const updatedOperation = await operationService.updateOperation(
    id,
    updateData,
  );

  const response = successResponse(
    updatedOperation,
    "Operation updated successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");

  // Use operation service to delete the operation
  await operationService.deleteOperation(id);

  const response = successResponse({ id }, "Operation deleted successfully");
  return c.json(response, HttpStatusCodes.OK);
};
