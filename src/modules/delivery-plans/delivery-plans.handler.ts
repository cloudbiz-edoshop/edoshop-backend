import type {
  CreateRoute,
  CreateFeeRuleRoute,
  GetOneRoute,
  ListRoute,
  ListFeeRulesRoute,
  PatchRoute,
  RemoveRoute,
  RemoveFeeRuleRoute,
  UpdateFeeRuleRoute,
} from "./delivery-plans.route";

import type {
  DeliveryFeeRuleResponse,
  DeliveryPlanResponse,
  ListDeliveryPlansResponse,
} from "./delivery-plans.schema";
import type { AppRouteHandler } from "@/lib/types";
import { STANDARD_MESSAGES } from "@/constants";
import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { DeliveryPlansService } from "./delivery-plans.service";

const deliveryPlansService = new DeliveryPlansService();

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  const parsedFilters =
    typeof filters === "string" ? JSON.parse(filters) : filters;

  const result = await deliveryPlansService.listDeliveryPlans({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters: parsedFilters,
  });

  const pagination = createPagination(result.total, page, limit);

  return c.json(
    successResponseWithPagination<ListDeliveryPlansResponse>(
      result.data,
      pagination,
      result.searchableFields,
    ),
    HttpStatusCodes.OK,
  );
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const data = c.req.valid("json");
  const user = c.get("user");

  const plan = await deliveryPlansService.createDeliveryPlan({
    ...data,
    createdBy: user.id,
  });

  return c.json(
    successResponse<DeliveryPlanResponse>(
      plan,
      STANDARD_MESSAGES.SUCCESS.CREATED,
    ),
    HttpStatusCodes.CREATED,
  );
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const plan = await deliveryPlansService.getDeliveryPlanById(id);

  return c.json(
    successResponse<DeliveryPlanResponse>(plan),
    HttpStatusCodes.OK,
  );
};

export const update: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const user = c.get("user");

  const plan = await deliveryPlansService.updateDeliveryPlan(id, {
    ...data,
    updatedBy: user.id,
  });

  return c.json(
    successResponse<DeliveryPlanResponse>(
      plan,
      STANDARD_MESSAGES.SUCCESS.UPDATED,
    ),
    HttpStatusCodes.OK,
  );
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");

  await deliveryPlansService.deleteDeliveryPlan(id);

  return new Response(null, { status: HttpStatusCodes.NO_CONTENT });
};

export const listFeeRules: AppRouteHandler<ListFeeRulesRoute> = async (c) => {
  const { planId } = c.req.valid("param");
  const rules = await deliveryPlansService.listFeeRules(planId);

  return c.json(successResponse(rules), HttpStatusCodes.OK);
};

export const createFeeRule: AppRouteHandler<CreateFeeRuleRoute> = async (c) => {
  const { planId } = c.req.valid("param");
  const data = c.req.valid("json");
  const rule = await deliveryPlansService.createFeeRule(planId, data);

  return c.json(
    successResponse<DeliveryFeeRuleResponse>(
      rule,
      STANDARD_MESSAGES.SUCCESS.CREATED,
    ),
    HttpStatusCodes.CREATED,
  );
};

export const updateFeeRule: AppRouteHandler<UpdateFeeRuleRoute> = async (c) => {
  const { planId, ruleId } = c.req.valid("param");
  const data = c.req.valid("json");
  const rule = await deliveryPlansService.updateFeeRule(planId, ruleId, data);

  return c.json(
    successResponse<DeliveryFeeRuleResponse>(
      rule,
      STANDARD_MESSAGES.SUCCESS.UPDATED,
    ),
    HttpStatusCodes.OK,
  );
};

export const removeFeeRule: AppRouteHandler<RemoveFeeRuleRoute> = async (c) => {
  const { planId, ruleId } = c.req.valid("param");
  await deliveryPlansService.deleteFeeRule(planId, ruleId);

  return new Response(null, { status: HttpStatusCodes.NO_CONTENT });
};
