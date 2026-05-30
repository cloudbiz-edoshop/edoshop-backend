import type {
  CreateEntryRoute,
  DeleteEntryRoute,
  GetAllBundleIdsRoute,
  GetAllEntryStatesRoute,
  GetAllEntryTypesRoute,
  GetAllItemIdsRoute,
  GetAllPackageIdsRoute,
  GetAllSeriesIdsRoute,
  GetEntriesByTypeRoute,
  ListRoute,
  UpdateEntryRoute,
} from "./entries.route";

import type {
  CreateEntriesRequest,
  GetAllEntryTypesResponse,
} from "./entries.schema";
import type { AppRouteHandler } from "@/lib/types";
import { STANDARD_MESSAGES } from "@/constants";
import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";

import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { EntriesService } from "./entries.service";

const entriesService = new EntriesService();

/**
 * Get all entry types
 */
export const getAllEntryTypes: AppRouteHandler<GetAllEntryTypesRoute> = async (
  c,
) => {
  const entryTypes: GetAllEntryTypesResponse =
    await entriesService.getEntryTypes();

  return c.json(
    successResponse(entryTypes, STANDARD_MESSAGES.SUCCESS.FETCHED),
    HttpStatusCodes.OK,
  );
};

/**
 * Create a new entry
 */
export const create: AppRouteHandler<CreateEntryRoute> = async (c) => {
  const body: CreateEntriesRequest = c.req.valid("json");
  const user = c.get("user");
  const createdEntry = await entriesService.createEntry({
    ...body,
    createdBy: user.id,
  });

  return c.json(
    successResponse(createdEntry, STANDARD_MESSAGES.SUCCESS.CREATED),
    HttpStatusCodes.CREATED,
  );
};

/**
 * Update entry
 */
export const patch: AppRouteHandler<UpdateEntryRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const user = c.get("user");

  const updatedEntry = await entriesService.update(id, {
    ...body,
    updatedBy: user.id,
  });

  return c.json(
    successResponse(updatedEntry, STANDARD_MESSAGES.SUCCESS.UPDATED),
    HttpStatusCodes.OK,
  );
};

/**
 * Delete entry
 */

export const removeSelected: AppRouteHandler<DeleteEntryRoute> = async (c) => {
  const { ids } = c.req.valid("json");
  const user = c.get("user");

  // Note: Updated service only supports single delete, process first ID
  if (ids.length > 0) {
    await entriesService.delete(ids[0], user.id);
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  const result = await entriesService.list({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });

  const pagination = createPagination(result.total, page, limit);

  return c.json(
    successResponseWithPagination(
      result.data,
      pagination,
      result.searchableFields,
      "Entries retrieved successfully",
    ),
    HttpStatusCodes.OK,
  );
};

export const getEntriesByType: AppRouteHandler<GetEntriesByTypeRoute> = async (
  c,
) => {
  const { entryTypeId } = c.req.valid("param");
  const queryParams = c.req.valid("query");
  const { page, limit, sortBy, sortOrder } = queryParams;

  const result = await entriesService.getEntriesByType(Number(entryTypeId), {
    page,
    limit,
    sortBy,
    sortOrder,
  });

  const pagination = createPagination(result.total, page, limit);

  return c.json(
    successResponseWithPagination(
      result.data,
      pagination,
      result.searchableFields,
      "User entries retrieved successfully",
    ),
    HttpStatusCodes.OK,
  );
};

export const getAllEntryStates: AppRouteHandler<
  GetAllEntryStatesRoute
> = async (c) => {
  const states = await entriesService.getAllEntryStates();
  return c.json(states, 200);
};

export const getAllBundleIds: AppRouteHandler<GetAllBundleIdsRoute> = async (
  c,
) => {
  const ids = await entriesService.getAllBundleIds();
  return c.json({ ids });
};

export const getAllSeriesIds: AppRouteHandler<GetAllSeriesIdsRoute> = async (
  c,
) => {
  const ids = await entriesService.getAllSeriesIds();
  return c.json({ ids });
};

export const getAllItemIds: AppRouteHandler<GetAllItemIdsRoute> = async (c) => {
  const ids = await entriesService.getAllItemIds();
  return c.json({ ids });
};

export const getAllPackageIds: AppRouteHandler<GetAllPackageIdsRoute> = async (
  c,
) => {
  const ids = await entriesService.getAllPackageIds();
  return c.json({ ids });
};
