import type {
  CreateRoute,
  GetOneRoute,
  ListRoute,
  PatchRoute,
  RemoveSelectedRoute,
} from "./promo-banners.route";

import type { AppRouteHandler } from "@/lib/types";
import { successResponse, successResponseWithPagination } from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { promoBannersService } from "./promo-banners.service";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const { page, limit, search } = c.req.valid("query");
  const result = await promoBannersService.list({ page, limit, search });
  return c.json(
    successResponseWithPagination(
      result.data,
      createPagination(result.total, page, limit),
      ["text"],
      "Promo banners retrieved successfully",
    ),
    HttpStatusCodes.OK,
  );
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const payload = c.get("accessTokenPayload");
  const data = await promoBannersService.create({
    ...c.req.valid("json"),
    createdBy: payload.userId,
  });
  return c.json(successResponse(data, "Promo banner created successfully"), HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const data = await promoBannersService.getById(id);
  return c.json(successResponse(data, "Promo banner retrieved successfully"), HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const payload = c.get("accessTokenPayload");
  const data = await promoBannersService.update(id, {
    ...c.req.valid("json"),
    updatedBy: payload.userId,
  });
  return c.json(successResponse(data, "Promo banner updated successfully"), HttpStatusCodes.OK);
};

export const removeSelected: AppRouteHandler<RemoveSelectedRoute> = async (c) => {
  const { ids } = c.req.valid("json");
  await promoBannersService.remove(ids);
  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
