import type {
  CreateRoute,
  GetOneRoute,
  ListRoute,
  PatchRoute,
  RemoveSelectedRoute,
} from "./about-us.route";

import type {
  CreateAboutUsResponse,
  GetAboutUsResponse,
  ListAboutUsResponse,
} from "./about-us.schema";
import type { AppRouteHandler } from "@/lib/types";
import { STANDARD_MESSAGES } from "@/constants";
import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";

import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { AboutUsService } from "./about-us.service";

const aboutUsService = new AboutUsService();

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  // Use supplier service for listing AboutUs
  const result = await aboutUsService.listAboutUs({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });

  const pagination = createPagination(result.total, page, limit);
  const aboutUsList: ListAboutUsResponse = result.data;
  const searchableFields: string[] = result.searchableFields;

  const response = successResponseWithPagination(
    aboutUsList,
    pagination,
    searchableFields,
    "AboutUs retrieved successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const { title, heading, text, primaryButtonText, date, delay, imageUrl } =
    c.req.valid("json");

  const payload = c.get("accessTokenPayload");
  const createdBy = payload.userId;

  const result = await aboutUsService.createAboutUs({
    title,
    heading,
    text,
    primaryButtonText,
    date,
    delay,
    imageUrl,
    createdBy,
  });

  const response: CreateAboutUsResponse = result;

  return c.json(
    successResponse(response, STANDARD_MESSAGES.AUTH.CUSTOMER_CREATED),
    HttpStatusCodes.OK,
  );
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const aboutUs = await aboutUsService.getAboutUsById(id);
  const typedResponse: GetAboutUsResponse = aboutUs;
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
  // Use aboutUs service to update the aboutUs
  const updatedAboutUs = await aboutUsService.updateAboutUs(id, data);

  const response = successResponse(
    updatedAboutUs,
    "AboutUs updated successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const removeSelected: AppRouteHandler<RemoveSelectedRoute> = async (
  c,
) => {
  const { ids } = c.req.valid("json");
  const payload = c.get("accessTokenPayload");
  const deletedBy = payload.userId;
  // Use aboutUs service to delete multiple aboutUs
  await aboutUsService.deleteAboutUs(ids, deletedBy);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
