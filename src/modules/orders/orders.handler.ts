import type {
  CheckoutDirectOrderRoute,
  GetFulfillmentOptionsRoute,
  GetMyOrderTrackingRoute,
  GetMyOrdersRoute,
  GetOrderDetailsForACustomerRoute,
  GetOrdersToFulfillRoute,
  UpdateAvailableQuantityForFulfillmentRoute,
} from "./orders.route";

import type { OrdersToFulfill } from "./orders.schema";
import type { AppRouteHandler } from "@/lib/types";
import { successResponse, successResponseWithPagination } from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { OrdersService } from "./orders.service";

const ordersService = new OrdersService();

export const getOrdersToFulfill: AppRouteHandler<
  GetOrdersToFulfillRoute
> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  const orders = await ordersService.getOrdersToFulfill({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });
  const pagination = createPagination(orders.total, page, limit);
  const ordersList: OrdersToFulfill = orders.data;
  const searchableFields: string[] = orders.searchableFields;

  const response = successResponseWithPagination(
    ordersList,
    pagination,
    searchableFields,
    "Orders to fulfill retrieved successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const getOrderDetailsForACustomer: AppRouteHandler<
  GetOrderDetailsForACustomerRoute
> = async (c) => {
  const { id } = c.req.valid("param");
  const { search, page, limit, sortBy, sortOrder, filters } =
    c.req.valid("query");

  const details = await ordersService.getOrderDetailsForACustomer(id, {
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });

  const pagination = createPagination(details.total, page, limit);
  const searchableFields: string[] = details.searchableFields;

  return c.json(
    successResponseWithPagination(
      details.data,
      pagination,
      searchableFields,
      "Customer order details retrieved successfully",
    ),
    HttpStatusCodes.OK,
  );
};

export const updateAvailableQuantity: AppRouteHandler<UpdateAvailableQuantityForFulfillmentRoute> = async (c) => {
  const updateData = c.req.valid("json");
  const payload = c.get("accessTokenPayload");
  const updatedBy = payload.userId;
  const data = {
    ...updateData,
    updatedBy,
  };

  // Use the service to update the available quantity
  const result = await ordersService.updateOrderItemQuantityForFulfillment(
    data,
  );

  const response = successResponse(result, "Available quantity updated successfully");
  return c.json(response, HttpStatusCodes.OK);
};

export const checkoutDirectOrder: AppRouteHandler<
  CheckoutDirectOrderRoute
> = async (c) => {
  const payload = c.req.valid("json");
  const accessTokenPayload = c.get("accessTokenPayload");
  const userId = accessTokenPayload.userId;

  const result = await ordersService.checkoutDirectOrder(userId, payload);

  return c.json(
    successResponse(result, "Direct order checkout completed successfully"),
    HttpStatusCodes.CREATED,
  );
};

export const getFulfillmentOptions: AppRouteHandler<
  GetFulfillmentOptionsRoute
> = async (c) => {
  const result = await ordersService.getFulfillmentOptions();
  return c.json(
    successResponse(result, "Fulfillment options retrieved successfully"),
    HttpStatusCodes.OK,
  );
};

export const getMyOrders: AppRouteHandler<GetMyOrdersRoute> = async (c) => {
  const { page, limit, cancelled } = c.req.valid("query");
  const accessTokenPayload = c.get("accessTokenPayload");
  const cancelledFilter =
    cancelled === "true" ? true : cancelled === "false" ? false : undefined;

  const result = await ordersService.getMyOrders(accessTokenPayload.userId, {
    page: page ?? 1,
    limit: limit ?? 20,
    cancelled: cancelledFilter,
  });
  const pagination = createPagination(result.total, page ?? 1, limit ?? 20);

  return c.json(
    successResponseWithPagination(
      result.data,
      pagination,
      [],
      "Customer orders retrieved successfully",
    ),
    HttpStatusCodes.OK,
  );
};

export const getMyOrderTracking: AppRouteHandler<
  GetMyOrderTrackingRoute
> = async (c) => {
  const { orderCode } = c.req.valid("param");
  const accessTokenPayload = c.get("accessTokenPayload");
  const result = await ordersService.getMyOrderTracking(
    accessTokenPayload.userId,
    orderCode,
  );

  return c.json(
    successResponse(result, "Order tracking retrieved successfully"),
    HttpStatusCodes.OK,
  );
};
