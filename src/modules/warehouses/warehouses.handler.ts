import type {
  CreateRoute,
  GetOneRoute,
  ListRoute,
  PatchRoute,
  RemoveSelectedRoute,
} from "./warehouses.route";

import type {
  CreateWarehouseResponse,
  GetWarehouseResponse,
  ListWarehousesResponse,
} from "./warehouses.schema";
import type { AppRouteHandler } from "@/lib/types";
import { STANDARD_MESSAGES } from "@/constants";
import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";

import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { WarehousesService } from "./warehouses.service";

const warehousesService = new WarehousesService();

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  // Use supplier service for listing Warehouses
  const result = await warehousesService.listWarehouses({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });

  const pagination = createPagination(result.total, page, limit);

  const warehousesList: ListWarehousesResponse = result.data;
  const searchableFields: string[] = result.searchableFields;

  // Format response with pagination metadata
  const response = successResponseWithPagination(
    warehousesList,
    pagination,
    searchableFields,
    "Warehouses retrieved successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const { name, description, address, countryId, cityId, postalCode } =
    c.req.valid("json");

  const payload = c.get("accessTokenPayload");
  const createdBy = payload.userId;

  const result = await warehousesService.createWarehouse({
    name,
    description,
    address,
    countryId,
    cityId,
    postalCode,
    createdBy,
  });

  const response: CreateWarehouseResponse = result;

  return c.json(
    successResponse(response, STANDARD_MESSAGES.AUTH.CUSTOMER_CREATED),
    HttpStatusCodes.OK,
  );
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const warehouse = await warehousesService.getWarehouseById(id);
  const typedResponse: GetWarehouseResponse = warehouse;
  const response = successResponse(
    typedResponse,
    STANDARD_MESSAGES.SUCCESS.FETCHED,
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
  // Use supplier service to update the supplier
  const updatedWarehouse = await warehousesService.updateWarehouse(data);

  const response = successResponse(
    updatedWarehouse,
    "Warehouse updated successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const removeSelected: AppRouteHandler<RemoveSelectedRoute> = async (
  c,
) => {
  const { ids } = c.req.valid("json");
  const payload = c.get("accessTokenPayload");
  const deletedBy = payload.userId;
  // Use warehouses service to delete multiple warehouses
  await warehousesService.deleteWarehouses(ids, deletedBy);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
