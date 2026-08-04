import type {
  BecomeRetailerRoute,
  CreateRoute,
  GetCurrentRetailerRoute,
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
import {
  assertCanManageCustomerContact,
  redactCustomerContact,
  redactCustomerContactList,
} from "@/lib/customer-contact-privacy";

import { PermissionsService } from "../permissions/permissions.service";
import { RetailersService } from "./retailers.service";

const retailersService = new RetailersService();
const permissionsService = new PermissionsService();

async function canViewCustomerContact(userId: number) {
  const accessProfile = await permissionsService.getUserAccessProfile(userId);
  return accessProfile.isSuperAdmin;
}

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;
  const payload = c.get("accessTokenPayload");
  const allowContact = await canViewCustomerContact(payload.userId);

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
  const retailersList: ListRetailersResponse = redactCustomerContactList(
    result.data,
    allowContact,
  );
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
  const body = c.req.valid("json");
  const { fullName, email, phone, countryId, cityId, address, shop, status } = body;

  const payload = c.get("accessTokenPayload");
  const allowContact = await canViewCustomerContact(payload.userId);
  assertCanManageCustomerContact(allowContact, body);
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

  const response: CreateRetailerResponse = redactCustomerContact(result, allowContact);

  return c.json(
    successResponse(response, "Retailer created successfully"),
    HttpStatusCodes.OK,
  );
};

export const becomeRetailer: AppRouteHandler<BecomeRetailerRoute> = async (
  c,
) => {
  const payload = c.get("accessTokenPayload");
  const body = c.req.valid("json") ?? {};
  const result = await retailersService.becomeRetailer(
    payload.userId,
    body.shop,
  );

  return c.json(
    successResponse(result, "Retailer request submitted successfully"),
    HttpStatusCodes.CREATED,
  );
};

export const getCurrentRetailer: AppRouteHandler<
  GetCurrentRetailerRoute
> = async (c) => {
  const payload = c.get("accessTokenPayload");
  const result = await retailersService.getCurrentRetailer(payload.userId);

  return c.json(
    successResponse(result, "Current retailer request"),
    HttpStatusCodes.OK,
  );
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const payload = c.get("accessTokenPayload");
  const allowContact = await canViewCustomerContact(payload.userId);
  const retailer = await retailersService.getRetailerById(id);
  const typedResponse: GetRetailerResponse = redactCustomerContact(
    retailer,
    allowContact,
  );
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
  const allowContact = await canViewCustomerContact(payload.userId);
  assertCanManageCustomerContact(allowContact, updateData);
  const updatedBy = payload.userId;
  const data = {
    ...updateData,
    id,
    updatedBy,
  };
  // Use retailer service to update the retailer
  const updatedRetailer = await retailersService.updateRetailer(data);

  const response = successResponse(
    redactCustomerContact(updatedRetailer, allowContact),
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
