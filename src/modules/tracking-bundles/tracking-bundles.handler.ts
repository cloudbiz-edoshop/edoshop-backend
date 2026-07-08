import type {
  AssignOrdersRoute,
  CreateRoute,
  GetOneRoute,
  ListRoute,
  ListStepsRoute,
  PatchRoute,
  RemoveOrderRoute,
  SearchOrderRoute,
  UpdateStepRoute,
} from "./tracking-bundles.route";

import type { AppRouteHandler } from "@/lib/types";
import { successResponse, successResponseWithPagination } from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { TrackingBundlesService } from "./tracking-bundles.service";

const trackingBundlesService = new TrackingBundlesService();

export const listSteps: AppRouteHandler<ListStepsRoute> = async (c) => {
  const steps = await trackingBundlesService.listSteps();
  return c.json(
    successResponse(steps, "Tracking steps retrieved successfully"),
    HttpStatusCodes.OK,
  );
};

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;
  const result = await trackingBundlesService.list({
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
      "Tracking bundles retrieved successfully",
    ),
    HttpStatusCodes.OK,
  );
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const payload = c.req.valid("json");
  const { userId } = c.get("accessTokenPayload");

  try {
    const bundle = await trackingBundlesService.create(payload, userId);
    return c.json(
      successResponse(bundle, "Tracking bundle created successfully"),
      HttpStatusCodes.OK,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create bundle";
    return c.json({ success: false, message }, HttpStatusCodes.BAD_REQUEST);
  }
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const bundle = await trackingBundlesService.getOne(id);

  if (!bundle) {
    return c.json({ success: false, message: "Bundle not found" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(
    successResponse(bundle, "Tracking bundle retrieved successfully"),
    HttpStatusCodes.OK,
  );
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const payload = c.req.valid("json");
  const { userId } = c.get("accessTokenPayload");
  const bundle = await trackingBundlesService.update(id, payload, userId);

  return c.json(
    successResponse(bundle, "Tracking bundle updated successfully"),
    HttpStatusCodes.OK,
  );
};

export const searchOrder: AppRouteHandler<SearchOrderRoute> = async (c) => {
  const { orderCode } = c.req.valid("query");
  const order = await trackingBundlesService.searchOrder(orderCode);

  if (!order) {
    return c.json({ success: false, message: "Order not found" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(
    successResponse(order, "Order found"),
    HttpStatusCodes.OK,
  );
};

export const assignOrders: AppRouteHandler<AssignOrdersRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const payload = c.req.valid("json");
  const { userId } = c.get("accessTokenPayload");

  try {
    const result = await trackingBundlesService.assignOrders(id, payload, userId);
    const bundle = await trackingBundlesService.getOne(id);
    return c.json(
      successResponse(
        { bundle, ...result },
        "Orders assigned to bundle successfully",
      ),
      HttpStatusCodes.OK,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to assign orders";
    return c.json({ success: false, message }, HttpStatusCodes.BAD_REQUEST);
  }
};

export const removeOrder: AppRouteHandler<RemoveOrderRoute> = async (c) => {
  const { id, orderId } = c.req.valid("param");
  await trackingBundlesService.removeOrder(id, orderId);
  const bundle = await trackingBundlesService.getOne(id);

  return c.json(
    successResponse(bundle, "Order removed from bundle"),
    HttpStatusCodes.OK,
  );
};

export const updateStep: AppRouteHandler<UpdateStepRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const payload = c.req.valid("json");
  const { userId } = c.get("accessTokenPayload");

  try {
    const bundle = await trackingBundlesService.updateStep(id, payload, userId);
    return c.json(
      successResponse(bundle, "Bundle tracking step updated successfully"),
      HttpStatusCodes.OK,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update step";
    return c.json({ success: false, message }, HttpStatusCodes.BAD_REQUEST);
  }
};
