import type {
  CreateRoute,
  GetOneRoute,
  ListAllRoute,
  ListRoute,
  RemoveRoute,
  UpdateStatusRoute,
} from "./reviews.route";

import type { AppRouteHandler } from "@/lib/types";
import { STANDARD_MESSAGES } from "@/constants";
import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";

import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { ReviewsService } from "./reviews.service";

const reviewsService = new ReviewsService();

export const listAll: AppRouteHandler<ListAllRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;
  const parsedFilters =
    typeof filters === "string" ? JSON.parse(filters) : filters;

  const result = await reviewsService.listReviews({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters: parsedFilters,
  });
  const pagination = createPagination(result.total, page, limit);

  return c.json(
    successResponseWithPagination(
      result.data,
      pagination,
      result.searchableFields,
    ),
    HttpStatusCodes.OK,
  );
};

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const productId = Number.parseInt(c.req.param("productId"));
  const reviews = await reviewsService.getReviewsByProductId(productId);
  return c.json(
    successResponse(reviews, STANDARD_MESSAGES.SUCCESS.FETCHED),
    HttpStatusCodes.OK,
  );
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const id = Number.parseInt(c.req.param("id"));
  const review = await reviewsService.getReviewById(id);
  return c.json(
    successResponse(review, STANDARD_MESSAGES.SUCCESS.FETCHED),
    HttpStatusCodes.OK,
  );
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");

  const review = await reviewsService.createReview({
    ...body,
    createdBy: user.id,
  });

  return c.json(
    successResponse(review, STANDARD_MESSAGES.SUCCESS.CREATED),
    HttpStatusCodes.CREATED,
  );
};

export const updateStatus: AppRouteHandler<UpdateStatusRoute> = async (c) => {
  const id = Number.parseInt(c.req.param("id"));
  const body = c.req.valid("json");
  const user = c.get("user");

  const review = await reviewsService.updateReviewStatus(id, {
    ...body,
    updatedBy: user.id,
  });

  return c.json(
    successResponse(review, STANDARD_MESSAGES.SUCCESS.UPDATED),
    HttpStatusCodes.OK,
  );
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const id = Number.parseInt(c.req.param("id"));
  await reviewsService.deleteReview(id);
  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
