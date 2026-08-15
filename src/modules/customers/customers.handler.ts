import type {
  CreateRoute,
  GetAllCustomerCodesRoute,
  GetAllCustomerIdsRoute,
  GetAllCustomerNamesRoute,
  GetOneRoute,
  ListRoute,
  PatchRoute,
  PublicSignupRoute,
  RemoveRoute,
  RemoveSelectedRoute,
  ResetPasswordRoute,
} from "./customers.route";

import type {
  CreateCustomerResponse,
  GetCustomerResponse,
  ListCustomersResponse,
} from "./customers.schema";
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
import { CustomersService } from "./customers.service";

const customersService = new CustomersService();
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

  // Use supplier service for listing Customers
  const result = await customersService.listCustomers({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });

  const pagination = createPagination(result.total, page, limit);
  const customersList: ListCustomersResponse = redactCustomerContactList(
    result.data,
    allowContact,
  );
  const searchableFields: string[] = result.searchableFields;

  // Format response with pagination metadata
  const response = successResponseWithPagination(
    customersList,
    pagination,
    searchableFields,
    "Customers retrieved successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const body = c.req.valid("json");
  const {
    fullName,
    email,
    phoneNumber,
    countryId,
    address,
    accountType,
    password,
  } = body;

  const payload = c.get("accessTokenPayload");
  const allowContact = await canViewCustomerContact(payload.userId);
  assertCanManageCustomerContact(allowContact, body);
  const createdBy = payload.userId;

  const result = await customersService.createCustomer({
    fullName,
    email,
    phoneNumber,
    countryId,
    address,
    accountType,
    password,
    createdBy,
  });

  const response: CreateCustomerResponse = redactCustomerContact(result, allowContact);

  return c.json(
    successResponse(response, STANDARD_MESSAGES.AUTH.CUSTOMER_CREATED),
    HttpStatusCodes.OK,
  );
};

export const publicSignup: AppRouteHandler<PublicSignupRoute> = async (c) => {
  const data = c.req.valid("json");
  const result = await customersService.createPublicCustomerSignup(data);

  return c.json(
    successResponse(result, "Customer registered successfully"),
    HttpStatusCodes.CREATED,
  );
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const payload = c.get("accessTokenPayload");
  const allowContact = await canViewCustomerContact(payload.userId);
  const customer = await customersService.getCustomerById(id);
  const typedResponse: GetCustomerResponse = redactCustomerContact(
    customer,
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
  // Use supplier service to update the supplier
  const updatedCustomer = await customersService.updateCustomer(data);

  const response = successResponse(
    redactCustomerContact(updatedCustomer, allowContact),
    "Customer updated successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const payload = c.get("accessTokenPayload");
  const deletedBy = payload.userId;
  // Use customers service to delete the customer
  await customersService.deleteCustomer(id, deletedBy);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const removeSelected: AppRouteHandler<RemoveSelectedRoute> = async (
  c,
) => {
  const { ids } = c.req.valid("json");
  const payload = c.get("accessTokenPayload");
  const deletedBy = payload.userId;
  // Use customers service to delete multiple customers
  await customersService.deleteCustomers(ids, deletedBy);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const getAllCustomerCodes: AppRouteHandler<
  GetAllCustomerCodesRoute
> = async (c) => {
  const codes = await customersService.getAllCustomerCodes();
  return c.json({ codes });
};

export const getAllCustomerIds: AppRouteHandler<
  GetAllCustomerIdsRoute
> = async (c) => {
  const ids = await customersService.getAllCustomerIds();
  return c.json({ ids });
};

export const getAllCustomerNames: AppRouteHandler<
  GetAllCustomerNamesRoute
> = async (c) => {
  const names = await customersService.getAllCustomerNames();
  return c.json({ names });
};

export const resetPassword: AppRouteHandler<ResetPasswordRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { password } = c.req.valid("json");

  const result = await customersService.resetCustomerPassword(id, password);

  return c.json(
    successResponse(result, "Customer password reset successfully"),
    HttpStatusCodes.OK,
  );
};
