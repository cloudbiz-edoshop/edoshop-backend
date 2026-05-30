import type {
  CreateBinsForShelfRoute,
  CreateRayonsForWarehouseRoute,
  CreateShelvesForRayonRoute,
  GetAllShelvesForRayonRoute,
  GetRayonsForWarehouseRoute,
  GetRayonsStatsForAWarehouseRoute,
  UpdateBinsForShelfRoute,
  UpdateRayonForWarehouseRoute,
  UpdateShelvesForRayonRoute,
} from "./rayons.route";

import type { CreateBinsResponseSchema, CreateShelvesForRayonResponseSchema, GetAllShelvesForRayonResponseSchema, GetRayonsForWarehouseResponseSchema, GetRayonsStatsForAWarehouseResponseSchema, UpdateShelvesResponseSchema } from "./rayons.schema";

import type { AppRouteHandler } from "@/lib/types";
import { successResponse, successResponseWithPagination } from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { RayonsService } from "./rayons.service";

const rayonsService = new RayonsService();

export const getRayonsStatsForAWarehouse: AppRouteHandler<
  GetRayonsStatsForAWarehouseRoute
> = async (c) => {
  const { warehouseId } = c.req.valid("param");
  const params = c.req.valid("query");

  const result = await rayonsService.getRayonsStatsForAWarehouse(warehouseId, params);

  const pagination = createPagination(result.total, params.page, params.limit);
  const rayonsList: GetRayonsStatsForAWarehouseResponseSchema = result.data;

  return c.json(
    successResponseWithPagination(
      rayonsList,
      pagination,
      result.searchableFields,
      `Rayons stats retrieved successfully for warehouse ${warehouseId}`,
    ),
    HttpStatusCodes.OK,
  );
};

export const getRayonsForWarehouse: AppRouteHandler<
  GetRayonsForWarehouseRoute
> = async (c) => {
  const { warehouseId } = c.req.valid("param");
  const params = c.req.valid("query");

  const result = await rayonsService.getRayonsForWarehouse(warehouseId, params);

  const pagination = createPagination(result.total, params.page, params.limit);
  const rayonsList: GetRayonsForWarehouseResponseSchema = result.data;

  return c.json(
    successResponseWithPagination(
      rayonsList,
      pagination,
      result.searchableFields,
      `Rayons retrieved successfully for warehouse ${warehouseId}`,
    ),
    HttpStatusCodes.OK,
  );
};

export const createRayonsForWarehouse: AppRouteHandler<
  CreateRayonsForWarehouseRoute
> = async (c) => {
  const { warehouseId } = c.req.valid("param");
  const { name, description } = c.req.valid("json");

  const payload = c.get("accessTokenPayload");
  const createdBy = payload.userId;
  const updatedBy = payload.userId;

  const result = await rayonsService.createRayonsForWarehouse(warehouseId, name, description, createdBy, updatedBy);

  return c.json(
    successResponse(
      [result],
      `Rayon created successfully for warehouse ${warehouseId}`,
    ),
    HttpStatusCodes.OK,
  );
};

export const createShelvesForRayon: AppRouteHandler<
  CreateShelvesForRayonRoute
> = async (c) => {
  const { rayonId, columnLabel, description } = c.req.valid("json");

  const payload = c.get("accessTokenPayload");
  const createdBy = payload.userId;
  const updatedBy = payload.userId;

  const result: CreateShelvesForRayonResponseSchema = await rayonsService.createShelvesForRayon(rayonId, columnLabel, description, createdBy, updatedBy);
  return c.json(
    successResponse(
      result,
      `Shelf created successfully for rayon ${rayonId}`,
    ),
    HttpStatusCodes.OK,
  );
};

export const getAllShelvesForRayon: AppRouteHandler<
  GetAllShelvesForRayonRoute
> = async (c) => {
  const { id: rayonId } = c.req.valid("param");
  const params = c.req.valid("query");

  const result = await rayonsService.getAllShelvesForRayon(rayonId, params);

  const pagination = createPagination(result.total, params.page, params.limit);
  const shelvesList: GetAllShelvesForRayonResponseSchema = result.data;

  return c.json(
    successResponseWithPagination(
      shelvesList,
      pagination,
      result.searchableFields,
      `Shelves retrieved successfully for rayon ${rayonId}`,
    ),
    HttpStatusCodes.OK,
  );
};

export const createBinsForShelf: AppRouteHandler<
  CreateBinsForShelfRoute
> = async (c) => {
  const { shelfId, rowNumber, locationCode } = c.req.valid("json");
  const payload = c.get("accessTokenPayload");
  const createdBy = payload.userId;
  const updatedBy = payload.userId;

  const result: CreateBinsResponseSchema = await rayonsService.createBinsForShelf(shelfId, rowNumber, locationCode, createdBy, updatedBy);

  return c.json(
    successResponse(
      result,
      `Bins created successfully for shelf ${shelfId}`,
    ),
    HttpStatusCodes.OK,
  );
};

export const updateRayonForWarehouse: AppRouteHandler<
  UpdateRayonForWarehouseRoute
> = async (c) => {
  const { id: rayonId } = c.req.valid("param");
  const { name, description } = c.req.valid("json");

  const payload = c.get("accessTokenPayload");
  const updatedBy = payload.userId;

  const result = await rayonsService.updateRayonForWarehouse(rayonId, name, description, updatedBy);

  return c.json(
    successResponse(
      result,
      `Rayon updated successfully for rayon ${rayonId}`,
    ),
    HttpStatusCodes.OK,
  );
};

export const updateShelvesForRayon: AppRouteHandler<
  UpdateShelvesForRayonRoute
> = async (c) => {
  const { id: shelfId } = c.req.valid("param");
  const { columnLabel, description } = c.req.valid("json");

  const payload = c.get("accessTokenPayload");
  const updatedBy = payload.userId;

  const result: UpdateShelvesResponseSchema = await rayonsService.updateShelvesForRayon(shelfId, columnLabel, description, updatedBy);

  return c.json(
    successResponse(
      result,
      `Shelf updated successfully for shelf ${shelfId}`,
    ),
    HttpStatusCodes.OK,
  );
};

export const updateBinsForShelf: AppRouteHandler<
  UpdateBinsForShelfRoute
> = async (c) => {
  const { id: binId } = c.req.valid("param");
  const { locationCode } = c.req.valid("json");

  const payload = c.get("accessTokenPayload");
  const updatedBy = payload.userId;

  const result = await rayonsService.updateBinsForShelf(binId, locationCode, updatedBy);

  return c.json(
    successResponse(
      result,
      `Bin updated successfully for bin ${binId}`,
    ),
    HttpStatusCodes.OK,
  );
};
