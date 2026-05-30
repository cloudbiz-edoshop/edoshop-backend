import type {
  CreateRoute,
  GetOneRoute,
  ListRoute,
  PatchRoute,
  RemoveSelectedRoute,
} from "./banners.route";

import type {
  CreateBannersRequest,
  CreateBannersResponse,
  GetBannersResponse,
  ListBannersResponse,
} from "./banners.schema";
import type { AppRouteHandler } from "@/lib/types";
import { STANDARD_MESSAGES } from "@/constants";
import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";

import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { BannersService } from "./banners.service";

const bannersService = new BannersService();

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  // Use supplier service for listing Banners
  const result = await bannersService.listBanners({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });

  const pagination = createPagination(result.total, page, limit);
  const bannersList: ListBannersResponse = result.data;
  const searchableFields: string[] = result.searchableFields;

  const response = successResponseWithPagination(
    bannersList,
    pagination,
    searchableFields,
    "Banners retrieved successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const req: CreateBannersRequest = c.req.valid("json");

  const payload = c.get("accessTokenPayload");
  const createdBy = payload.userId;

  const result = await bannersService.createBanners({
    ...req,
    createdBy,
  });

  const response: CreateBannersResponse = result;

  return c.json(
    successResponse(response, STANDARD_MESSAGES.AUTH.CUSTOMER_CREATED),
    HttpStatusCodes.OK,
  );
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const banners = await bannersService.getBannersById(id);
  const typedResponse: GetBannersResponse = banners;
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
  // Use banners service to update the banners
  const updatedBanners = await bannersService.updateBanners(id, data);

  const response = successResponse(
    updatedBanners,
    "Banners updated successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const removeSelected: AppRouteHandler<RemoveSelectedRoute> = async (
  c,
) => {
  const { ids } = c.req.valid("json");
  const payload = c.get("accessTokenPayload");
  const deletedBy = payload.userId;
  // Use banners service to delete multiple banners
  await bannersService.deleteBanners(ids, deletedBy);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
