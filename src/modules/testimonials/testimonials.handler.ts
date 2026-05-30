import type {
  CreateRoute,
  GetOneRoute,
  ListRoute,
  PatchRoute,
  RemoveSelectedRoute,
} from "./testimonials.route";

import type {
  CreateTestimonialsResponse,
  GetTestimonialsResponse,
  ListTestimonialsResponse,
} from "./testimonials.schema";
import type { AppRouteHandler } from "@/lib/types";
import { STANDARD_MESSAGES } from "@/constants";
import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";

import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { TestimonialsService } from "./testimonials.service";

const testimonialsService = new TestimonialsService();

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  // Use supplier service for listing Testimonials
  const result = await testimonialsService.listTestimonials({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });

  const pagination = createPagination(result.total, page, limit);
  const testimonialsList: ListTestimonialsResponse = result.data;
  const searchableFields: string[] = result.searchableFields;

  const response = successResponseWithPagination(
    testimonialsList,
    pagination,
    searchableFields,
    "Testimonials retrieved successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const { order, authorName, authorTitle, testimonial, imageUrl } =
    c.req.valid("json");

  const payload = c.get("accessTokenPayload");
  const createdBy = payload.userId;

  const result = await testimonialsService.createTestimonials({
    order,
    authorName,
    authorTitle,
    testimonial,
    imageUrl,
    createdBy,
  });

  const response: CreateTestimonialsResponse = result;

  return c.json(
    successResponse(response, STANDARD_MESSAGES.AUTH.CUSTOMER_CREATED),
    HttpStatusCodes.OK,
  );
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const testimonials = await testimonialsService.getTestimonialsById(id);
  const typedResponse: GetTestimonialsResponse = testimonials;
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
  // Use testimonials service to update the testimonials
  const updatedTestimonials = await testimonialsService.updateTestimonials(
    id,
    data,
  );

  const response = successResponse(
    updatedTestimonials,
    "Testimonials updated successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const removeSelected: AppRouteHandler<RemoveSelectedRoute> = async (
  c,
) => {
  const { ids } = c.req.valid("json");
  const payload = c.get("accessTokenPayload");
  const deletedBy = payload.userId;
  // Use testimonials service to delete multiple testimonials
  await testimonialsService.deleteTestimonials(ids, deletedBy);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
