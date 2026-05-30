import type {
  CreateRoute,
  GetOneRoute,
  ListRoute,
  PatchRoute,
  RemoveRoute,
} from "./discounts.route";

import type {
  CreateDiscountResponse,
  GetDiscountResponse,
  ListDiscountsResponse,
} from "./discounts.schema";
import type { AppRouteHandler } from "@/lib/types";
import { STANDARD_MESSAGES } from "@/constants";
import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";

import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { DiscountsService } from "./discounts.service";

const discountsService = new DiscountsService();

/**
 * List discounts
 */
export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  // Parse filters if it's a string
  const parsedFilters =
    typeof filters === "string" ? JSON.parse(filters) : filters;

  const result = await discountsService.listDiscounts({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters: parsedFilters,
  });

  const pagination = createPagination(result.total, page, limit);

  return c.json(
    successResponseWithPagination<ListDiscountsResponse>(
      result.data,
      pagination,
      result.searchableFields,
    ),
    HttpStatusCodes.OK,
  );
};

/**
 * Create a discount
 */
export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const data = c.req.valid("json");
  const user = c.get("user");

  const discount = await discountsService.createDiscount({
    ...data,
    createdBy: user.id,
  });

  return c.json(
    successResponse<CreateDiscountResponse>(
      discount,
      STANDARD_MESSAGES.SUCCESS.CREATED,
    ),
    HttpStatusCodes.CREATED,
  );
};

/**
 * Get a discount
 */
export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const discount = await discountsService.getDiscountById(id);

  return c.json(
    successResponse<GetDiscountResponse>(discount),
    HttpStatusCodes.OK,
  );
};

/**
 * Update a discount
 */
export const update: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const user = c.get("user");

  const discount = await discountsService.updateDiscount(id, {
    ...data,
    updatedBy: user.id,
  });

  return c.json(
    successResponse<CreateDiscountResponse>(
      discount,
      STANDARD_MESSAGES.SUCCESS.UPDATED,
    ),
    HttpStatusCodes.OK,
  );
};

/**
 * Delete a discount
 */
export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");

  await discountsService.deleteDiscount(id);

  return new Response(null, { status: HttpStatusCodes.NO_CONTENT });
};
