import type {
  CreateRoute,
  GetOneRoute,
  ListRoute,
  PatchRoute,
  RemoveSelectedRoute,
} from "./categories.route";

import type {
  CreateCategoriesResponse,
  GetCategoriesResponse,
  ListCategoriesResponse,
} from "./categories.schema";
import type { AppRouteHandler } from "@/lib/types";
import { STANDARD_MESSAGES } from "@/constants";
import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";

import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { CategoriesService } from "./categories.service";

const categoriesService = new CategoriesService();

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  // Use supplier service for listing Categories
  const result = await categoriesService.listCategories({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });

  const pagination = createPagination(result.total, page, limit);
  const categoriesList: ListCategoriesResponse = result.data;
  const searchableFields: string[] = result.searchableFields;

  const response = successResponseWithPagination(
    categoriesList,
    pagination,
    searchableFields,
    "Categories retrieved successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const { name, description, parentId, level } = c.req.valid("json");

  const payload = c.get("accessTokenPayload");
  const createdBy = payload.userId;

  const result = await categoriesService.createCategories({
    name,
    description,
    parentId,
    level,
    createdBy,
  });

  const response: CreateCategoriesResponse = result;

  return c.json(
    successResponse(response, STANDARD_MESSAGES.AUTH.CUSTOMER_CREATED),
    HttpStatusCodes.OK,
  );
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const categories = await categoriesService.getCategoriesById(id);
  const typedResponse: GetCategoriesResponse = categories;
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
    updatedBy,
  };
  // Use categories service to update the categories
  const updatedCategories = await categoriesService.updateCategories(id, data);

  const response = successResponse(
    updatedCategories,
    "Categories updated successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const removeSelected: AppRouteHandler<RemoveSelectedRoute> = async (
  c,
) => {
  const { ids } = c.req.valid("json");
  const payload = c.get("accessTokenPayload");
  const deletedBy = payload.userId;
  // Use categories service to delete multiple categories
  await categoriesService.deleteCategories(ids, deletedBy);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
