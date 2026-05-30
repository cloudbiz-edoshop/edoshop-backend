import type { AppRouteHandler } from "@/lib/types";
import type {
  CreateRoute,
  GetAllSupplierCodesRoute,
  GetAllSupplierIdsRoute,
  GetOneRoute,
  ListRoute,
  PatchRoute,
  RemoveRoute,
  RemoveSelectedRoute,
} from "@/modules/suppliers/suppliers.route";
import type {
  CreateSupplierResponse,
  GetSupplierResponse,
  ListSuppliersResponse,
} from "@/modules/suppliers/suppliers.schema";

import { STANDARD_MESSAGES } from "@/constants";
import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";
import { SupplierService } from "@/modules/suppliers/suppliers.service";

// Create service instance
const supplierService = new SupplierService();

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const {
    fullName,
    storeName,
    email,
    phoneNumber,
    address,
    countryId,
    paymentMethodId,
    entryTypeId,
    bankAccountName,
    bankAccountNumber,
    profilePhotoUrl,
  } = c.req.valid("json");

  const userId = c.get("user").id;

  // Use supplier service to create the supplier
  const supplier = await supplierService.createSupplier({
    fullName,
    storeName,
    email,
    phoneNumber,
    address,
    countryId,
    paymentMethodId,
    entryTypeId,
    bankAccountName,
    bankAccountNumber,
    profilePhotoUrl,
    createdBy: userId,
  });
  const typedResponse: CreateSupplierResponse = supplier;
  const response = successResponse(
    typedResponse,
    STANDARD_MESSAGES.SUPPLIER.CREATED,
  );
  return c.json(response, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const supplier = await supplierService.getSupplier(id);
  const typedResponse: GetSupplierResponse = supplier;
  const response = successResponse(
    typedResponse,
    STANDARD_MESSAGES.SUPPLIER.FETCHED,
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  // Use supplier service for listing suppliers
  const result = await supplierService.listSuppliers({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });

  const pagination = createPagination(result.total, page, limit);
  const suppliersList: ListSuppliersResponse = result.data;
  const searchableFields: string[] = result.searchableFields;

  const response = successResponseWithPagination(
    suppliersList,
    pagination,
    searchableFields,
    "Suppliers retrieved successfully",
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
  // Use supplier service to update the supplier
  const updatedSupplier = await supplierService.updateSupplier(data);

  const response = successResponse(
    updatedSupplier,
    "Supplier updated successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const payload = c.get("accessTokenPayload");
  const deletedBy = payload.userId;
  // Use supplier service to delete the supplier
  await supplierService.deleteSupplier(id, deletedBy);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const removeSelected: AppRouteHandler<RemoveSelectedRoute> = async (
  c,
) => {
  const { ids } = c.req.valid("json");
  const payload = c.get("accessTokenPayload");
  const deletedBy = payload.userId;
  // Use supplier service to delete multiple suppliers
  await supplierService.deleteSuppliers(ids, deletedBy);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const getAllSupplierCodes: AppRouteHandler<
  GetAllSupplierCodesRoute
> = async (c) => {
  const codes = await supplierService.getAllSupplierCodes();
  return c.json({ codes });
};

export const getAllSupplierIds: AppRouteHandler<
  GetAllSupplierIdsRoute
> = async (c) => {
  const ids = await supplierService.getAllSupplierIds();
  return c.json({ ids });
};
