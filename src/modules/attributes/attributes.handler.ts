import type {
  CreateRoute,
  GetOneRoute,
  GetTypesRoute,
  ListRoute,
  PatchRoute,
  RemoveSelectedRoute,
} from "./attributes.route";

import type {
  CreateAttributesResponse,
  GetAttributesResponse,
  ListAttributesResponse,
} from "./attributes.schema";
import type { AppRouteHandler } from "@/lib/types";
import { STANDARD_MESSAGES } from "@/constants";
import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";

import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { AttributesService } from "./attributes.service";

const attributesService = new AttributesService();

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  // Use supplier service for listing Attributes
  const result = await attributesService.listAttributes({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });

  const pagination = createPagination(result.total, page, limit);
  const attributesList: ListAttributesResponse = result.data;
  const searchableFields: string[] = result.searchableFields;

  const response = successResponseWithPagination(
    attributesList,
    pagination,
    searchableFields,
    "Attributes retrieved successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const getTypes: AppRouteHandler<GetTypesRoute> = async (c) => {
  const result = await attributesService.getAttributeTypes();
  const response = successResponse(
    result,
    "Attribute types retrieved successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const { name, description, attributeTypeId } = c.req.valid("json");

  const payload = c.get("accessTokenPayload");
  const createdBy = payload.userId;

  const result = await attributesService.createAttributes({
    name,
    description,
    attributeTypeId,
    createdBy,
  });

  const response: CreateAttributesResponse = result;

  return c.json(
    successResponse(response, STANDARD_MESSAGES.AUTH.CUSTOMER_CREATED),
    HttpStatusCodes.OK,
  );
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const attributes = await attributesService.getAttributesById(id);
  const typedResponse: GetAttributesResponse = attributes;
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
  // Use supplier service to update the supplier
  const updatedAttributes = await attributesService.updateAttributes(id, data);

  const response = successResponse(
    updatedAttributes,
    "Attributes updated successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const removeSelected: AppRouteHandler<RemoveSelectedRoute> = async (
  c,
) => {
  const { ids } = c.req.valid("json");
  const payload = c.get("accessTokenPayload");
  const deletedBy = payload.userId;
  // Use attributes service to delete multiple attributes
  await attributesService.deleteAttributes(ids, deletedBy);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
