import type {
  AddProductsRoute,
  CreateRoute,
  GetOneRoute,
  ListOnlyNewArrivalProductsRoute,
  ListRoute,
  PatchRoute,
  RemoveProductsRoute,
  RemoveRoute,
} from "./new-arrivals.route";

import type {
  CreateNewArrivalResponse,
  GetNewArrivalResponse,
  ListNewArrivalsResponse,
  ListProductsAsNewArrivalsResponse,
} from "./new-arrivals.schema";
import type { AppRouteHandler } from "@/lib/types";
import { STANDARD_MESSAGES } from "@/constants";
import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";

import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { NewArrivalsService } from "./new-arrivals.service";

const newArrivalsService = new NewArrivalsService();

/**
 * List new arrival periods
 */
export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  const result = await newArrivalsService.listNewArrivals({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });

  const pagination = createPagination(result.total, page, limit);

  return c.json(
    successResponseWithPagination<ListNewArrivalsResponse>(
      result.data,
      pagination,
      result.searchableFields,
    ),
    HttpStatusCodes.OK,
  );
};

/**
 * Get new arrival period by ID
 */
export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const newArrival = await newArrivalsService.getNewArrivalById(id);

  return c.json(
    successResponse<GetNewArrivalResponse>(
      newArrival,
      STANDARD_MESSAGES.SUCCESS.FETCHED,
    ),
    HttpStatusCodes.OK,
  );
};

/**
 * Create new arrival period
 */
export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");

  const newArrival = await newArrivalsService.createNewArrival({
    ...body,
    createdBy: user.id,
  });

  return c.json(
    successResponse<CreateNewArrivalResponse>(
      newArrival,
      STANDARD_MESSAGES.SUCCESS.CREATED,
    ),
    HttpStatusCodes.OK,
  );
};

/**
 * Update existing new arrival period
 */
export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const user = c.get("user");

  const updated = await newArrivalsService.updateNewArrival(id, {
    ...body,
    updatedBy: user.id,
  });

  return c.json(
    successResponse<CreateNewArrivalResponse>(
      updated,
      STANDARD_MESSAGES.SUCCESS.UPDATED,
    ),
    HttpStatusCodes.OK,
  );
};

/**
 * Delete new arrival period
 */
export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");

  await newArrivalsService.deleteNewArrival(id);

  return c.json(
    successResponse({}, STANDARD_MESSAGES.SUCCESS.DELETED),
    HttpStatusCodes.OK,
  );
};

/**
 * Add products to new arrivals
 */
export const addProducts: AppRouteHandler<AddProductsRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const user = c.get("user");

  await newArrivalsService.addProductsToNewArrivals(id, {
    ...body,
    createdBy: user.id,
  });

  return c.json(
    successResponse({ success: true }, "Products added to new arrivals successfully"),
    HttpStatusCodes.OK,
  );
};

/**
 * Remove products from new arrivals
 */
export const removeProducts: AppRouteHandler<RemoveProductsRoute> = async (
  c,
) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const user = c.get("user");

  await newArrivalsService.removeProductsFromNewArrivals(id, {
    ...body,
    updatedBy: user.id,
  });

  return c.json(
    successResponse({ success: true }, "Products removed from new arrivals successfully"),
    HttpStatusCodes.OK,
  );
};

/**
 * List only new arrival products (currently active new arrivals)
 */
export const listOnlyNewArrivalProducts: AppRouteHandler<
  ListOnlyNewArrivalProductsRoute
> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  const result = await newArrivalsService.getOnlyNewArrivalProducts({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });

  const pagination = createPagination(result.total, page, limit);

  return c.json(
    successResponseWithPagination<ListProductsAsNewArrivalsResponse>(
      result.data,
      pagination,
      result.searchableFields,
    ),
    HttpStatusCodes.OK,
  );
};
