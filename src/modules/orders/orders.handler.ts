import type {
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
