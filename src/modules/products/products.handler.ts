import type {
  CreateRoute,
  GetAllGroupCriteriaTypesRoute,
  GetAllProductCodesRoute,
  GetAllProductIdsRoute,
  GetOneRoute,
  ListRoute,
  PatchRoute,
  RemoveSelectedRoute,
} from "./products.route";

import type {
  CreateProductResponse,
  GetProductResponse,
} from "./products.schema";
import type { AppRouteHandler } from "@/lib/types";
import { STANDARD_MESSAGES } from "@/constants";
import { successResponse } from "@/lib/api-response";

import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { ProductsService } from "./products.service";

const productsService = new ProductsService();

export const getAllGroupCriteriaTypes: AppRouteHandler<GetAllGroupCriteriaTypesRoute> = async (
  c,
) => {
  const groupCriteriaTypes = await productsService.getGroupCriteriaTypes();

  return c.json(
    successResponse(groupCriteriaTypes, STANDARD_MESSAGES.SUCCESS.FETCHED),
    HttpStatusCodes.OK,
  );
};
/**
 * List products
 */
export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  const result = await productsService.listProducts({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });

  const pagination = createPagination(result.total, page, limit);

  return c.json(
    {
      data: result.data,
      pagination,
      searchableFields: result.searchableFields,
    },
    HttpStatusCodes.OK,
  );
};

/**
 * Get product by ID
 */
export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const product = await productsService.getProductById(id);

  return c.json(
    successResponse<GetProductResponse>(
      product,
      STANDARD_MESSAGES.SUCCESS.FETCHED,
    ),
    HttpStatusCodes.OK,
  );
};

/**
 * Create new product
 */
export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");

  const product = await productsService.createProduct({
    ...body,
    createdBy: user.id,
  });

  return c.json(
    successResponse<CreateProductResponse>(
      product,
      STANDARD_MESSAGES.SUCCESS.CREATED,
    ),
    HttpStatusCodes.OK,
  );
};

/**
 * Update existing product
 */
export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const user = c.get("user");

  const updated = await productsService.updateProduct(id, {
    ...body,
    updatedBy: user.id,
  });

  return c.json(
    successResponse<CreateProductResponse>(
      updated,
      STANDARD_MESSAGES.SUCCESS.UPDATED,
    ),
    HttpStatusCodes.OK,
  );
};

/**
 * Soft delete selected products
 */
export const removeSelected: AppRouteHandler<RemoveSelectedRoute> = async (
  c,
) => {
  const { ids } = c.req.valid("json");
  const user = c.get("user");

  await productsService.deleteProducts(ids, user.id);

  return c.json(
    successResponse(null, STANDARD_MESSAGES.SUCCESS.DELETED),
    HttpStatusCodes.OK,
  );
};

export const getAllProductCodes: AppRouteHandler<
  GetAllProductCodesRoute
> = async (c) => {
  const codes = await productsService.getAllProductCodes();
  return c.json({ codes });
};

export const getAllProductIds: AppRouteHandler<GetAllProductIdsRoute> = async (
  c,
) => {
  const ids = await productsService.getAllProductIds();
  return c.json({ ids });
};
