import type {
  CreatePaymentMethodResponse,
  GetPaymentMethodResponse,
  ListPaymentMethodsResponse,
  UpdatePaymentMethodResponse,
} from "./payment-methods.schema";
import type { AppRouteHandler } from "@/lib/types";

import type {
  CreateRoute,
  GetOneRoute,
  ListRoute,
  PatchRoute,
  RemoveRoute,
  RemoveSelectedRoute,
} from "@/modules/payment-methods/payment-methods.route";
import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { PaymentMethodService } from "@/modules/payment-methods/payment-methods.service";

// Create service instance
const paymentMethodService = new PaymentMethodService();

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  // Use payment method service for listing payment methods
  const result = await paymentMethodService.listPaymentMethods({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });

  const pagination = createPagination(result.total, page, limit);
  const paymentMethodsList: ListPaymentMethodsResponse = result.data;
  const searchableFields: string[] = result.searchableFields;

  // Format response with pagination metadata
  const response = successResponseWithPagination(
    paymentMethodsList,
    pagination,
    searchableFields,
    "Payment methods retrieved successfully",
  );

  return c.json(response, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const paymentMethodData = c.req.valid("json");
  const payload = c.get("accessTokenPayload");
  const createdBy = payload.userId;
  // Use payment method service to create the payment method
  const paymentMethod: CreatePaymentMethodResponse =
    await paymentMethodService.createPaymentMethod({
      ...paymentMethodData,
      createdBy,
      updatedBy: createdBy,
    });

  const response = successResponse(
    paymentMethod,
    "Payment method created successfully",
  );
  return c.json(response, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");

  // Use payment method service to get the payment method by ID
  const paymentMethod: GetPaymentMethodResponse =
    await paymentMethodService.getPaymentMethod(id);

  const response = successResponse(
    paymentMethod,
    "Payment method retrieved successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const updateData = c.req.valid("json");
  const payload = c.get("accessTokenPayload");
  const updatedBy = payload.userId;

  // Use payment method service to update the payment method
  const updatedPaymentMethod: UpdatePaymentMethodResponse =
    await paymentMethodService.updatePaymentMethod(id, {
      ...updateData,
      updatedBy,
    });

  const response = successResponse(
    updatedPaymentMethod,
    "Payment method updated successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const payload = c.get("accessTokenPayload");
  const deletedBy = payload.userId;
  // Use payment method service to delete the payment method
  await paymentMethodService.deletePaymentMethod(id, deletedBy);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const removeSelected: AppRouteHandler<RemoveSelectedRoute> = async (
  c,
) => {
  const { ids } = c.req.valid("json");
  const payload = c.get("accessTokenPayload");
  const deletedBy = payload.userId;
  // Use payment method service to delete the payment methods
  await paymentMethodService.deletePaymentMethods(ids, deletedBy);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
