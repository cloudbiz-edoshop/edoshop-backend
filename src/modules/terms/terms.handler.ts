import type {
  CreateRoute,
  GetDefaultsRoute,
  GetOneRoute,
  GetPublicRoute,
  ListRoute,
  PatchRoute,
  RemoveSelectedRoute,
} from "./terms.route";

import type { AppRouteHandler } from "@/lib/types";
import { STANDARD_MESSAGES } from "@/constants";
import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { TermsService } from "./terms.service";

const termsService = new TermsService();

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  const result = await termsService.listTerms({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });

  const pagination = createPagination(result.total, page, limit);

  return c.json(
    successResponseWithPagination(
      result.data,
      pagination,
      result.searchableFields,
      "Terms retrieved successfully",
    ),
    HttpStatusCodes.OK,
  );
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const payload = c.req.valid("json");
  const { userId } = c.get("accessTokenPayload");

  const result = await termsService.createTerms({
    ...payload,
    createdBy: userId,
  });

  return c.json(
    successResponse(result, "Terms created successfully"),
    HttpStatusCodes.OK,
  );
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const record = await termsService.getTermsById(id);

  return c.json(
    successResponse(record, STANDARD_MESSAGES.SUCCESS.FETCHED),
    HttpStatusCodes.OK,
  );
};

export const getDefaults: AppRouteHandler<GetDefaultsRoute> = async (c) => {
  const { languageCode } = c.req.valid("query");
  const defaults = await termsService.getTermsDefaults(languageCode);

  return c.json(
    successResponse(defaults, "Default terms retrieved successfully"),
    HttpStatusCodes.OK,
  );
};

export const getPublic: AppRouteHandler<GetPublicRoute> = async (c) => {
  const { languageCode } = c.req.valid("query");
  const record = await termsService.getPublicTerms(languageCode);

  return c.json(
    successResponse(record, "Public terms retrieved successfully"),
    HttpStatusCodes.OK,
  );
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const updateData = c.req.valid("json");
  const { userId } = c.get("accessTokenPayload");

  const updated = await termsService.updateTerms(id, {
    ...updateData,
    updatedBy: userId,
  });

  return c.json(
    successResponse(updated, "Terms updated successfully"),
    HttpStatusCodes.OK,
  );
};

export const removeSelected: AppRouteHandler<RemoveSelectedRoute> = async (
  c,
) => {
  const { ids } = c.req.valid("json");
  const { userId } = c.get("accessTokenPayload");

  await termsService.deleteTerms(ids, userId);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
