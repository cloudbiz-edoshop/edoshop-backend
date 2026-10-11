import type {
  CreateRoute,
  GetOneRoute,
  ListRoute,
  PatchRoute,
  RemoveRoute,
  ValidatePublicRoute,
} from "./coupons.route";

import type { AppRouteHandler } from "@/lib/types";
import { successResponse, successResponseWithPagination } from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { CouponsService } from "./coupons.service";

const couponsService = new CouponsService();

export const validatePublic: AppRouteHandler<ValidatePublicRoute> = async (c) => {
  const { code, subtotal } = c.req.valid("json");
  const result = await couponsService.validatePublicCoupon(code, subtotal);

  return c.json(successResponse(result), HttpStatusCodes.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;
  const parsedFilters =
    typeof filters === "string" ? JSON.parse(filters) : filters;

  const result = await couponsService.listCoupons({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters: parsedFilters,
  });

  const pagination = createPagination(result.total, page, limit);

  return c.json(
    successResponseWithPagination(result.data, pagination, result.searchableFields),
    HttpStatusCodes.OK,
  );
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const data = c.req.valid("json");
  const user = c.get("user");
  const coupon = await couponsService.createCoupon({
    ...data,
    createdBy: user.id,
  });

  return c.json(successResponse(coupon, "Coupon created successfully"), HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const coupon = await couponsService.getCoupon(Number(id));
  return c.json(successResponse(coupon), HttpStatusCodes.OK);
};

export const update: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const user = c.get("user");
  const coupon = await couponsService.updateCoupon(Number(id), {
    ...data,
    updatedBy: user.id,
  });

  return c.json(successResponse(coupon, "Coupon updated successfully"), HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");
  await couponsService.deleteCoupon(Number(id));
  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
