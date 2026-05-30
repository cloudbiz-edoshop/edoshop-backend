import type {
  CreateRoute,
  GetOneRoute,
  ListRoute,
  UpdateStatusRoute,
} from "./reviews.route";

import type { AppRouteHandler } from "@/lib/types";
import { STANDARD_MESSAGES } from "@/constants";
import { successResponse } from "@/lib/api-response";

import * as HttpStatusCodes from "@/lib/http-status-codes";

import { ReviewsService } from "./reviews.service";

const reviewsService = new ReviewsService();

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
