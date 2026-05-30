import type {
  CreateRoute,
  GetOneRoute,
  ListRoute,
  PatchRoute,
  RemoveManyRoute,
} from "./retailers.route";

import type {
  CreateRetailerResponse,
  GetRetailerResponse,
  ListRetailersResponse,
} from "./retailers.schema";
import type { AppRouteHandler } from "@/lib/types";
import { STANDARD_MESSAGES } from "@/constants";
import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";

import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { RetailersService } from "./retailers.service";

const retailersService = new RetailersService();

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  // Use retailer service for listing Retailers
  const result = await retailersService.listRetailers({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });

  const pagination = createPagination(result.total, page, limit);
  const retailersList: ListRetailersResponse = result.data;
  const searchableFields: string[] = result.searchableFields;

  // Format response with pagination metadata
  const response = successResponseWithPagination(
    retailersList,
    pagination,
    searchableFields,
    "Retailers retrieved successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const { fullName, email, phone, countryId, cityId, address, shop, status } =
    c.req.valid("json");

  const payload = c.get("accessTokenPayload");
  const createdBy = payload.userId;

  const result = await retailersService.createRetailer({
    fullName,
    email,
    phone,
    countryId,
    cityId,
    address,
    shop,
    status,
    createdBy,
  });

  const response: CreateRetailerResponse = result;

  return c.json(
    successResponse(response, "Retailer created successfully"),
    HttpStatusCodes.OK,
  );
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const retailer = await retailersService.getRetailerById(id);
  const typedResponse: GetRetailerResponse = retailer;
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
  // Use retailer service to update the retailer
  const updatedRetailer = await retailersService.updateRetailer(data);

  const response = successResponse(
    updatedRetailer,
    "Retailer updated successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const removeMany: AppRouteHandler<RemoveManyRoute> = async (c) => {
  const { ids } = c.req.valid("json");
  const payload = c.get("accessTokenPayload");
  const deletedBy = payload.userId;
  // Use retailers service to delete multiple retailers
  await retailersService.deleteRetailers(ids, deletedBy);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
