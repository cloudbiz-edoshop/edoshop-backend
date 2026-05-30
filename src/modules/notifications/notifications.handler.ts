import type {
  CreateRoute,
  GetNotificationFrequenciesRoute,
  GetNotificationRecipientTypes,
  GetNotificationTypesRoute,
  GetOneRoute,
  ListRoute,
  PatchRoute,
  RemoveSelectedRoute,
} from "./notifications.route";

import type {
  CreateNotificationsResponse,
  GetNotificationsResponse,
  ListNotificationsResponse,
} from "./notifications.schema";
import type { AppRouteHandler } from "@/lib/types";
import { STANDARD_MESSAGES } from "@/constants";
import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";

import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { NotificationsService } from "./notifications.service";

const notificationsService = new NotificationsService();

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  // Use supplier service for listing Notifications
  const result = await notificationsService.listNotifications({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });

  const pagination = createPagination(result.total, page, limit);
  const notificationsList: ListNotificationsResponse = result.data;
  const searchableFields: string[] = result.searchableFields;

  const response = successResponseWithPagination(
    notificationsList,
    pagination,
    searchableFields,
    "Notifications retrieved successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const {
    title,
    message,
    notificationTypeId,
    notificationFrequencyId,
    recipientTypeId,
    recipientIds,
  } = c.req.valid("json");

  const payload = c.get("accessTokenPayload");
  const createdBy = payload.userId;

  const result = await notificationsService.createNotifications({
    title,
    message,
    notificationTypeId,
    notificationFrequencyId,
    recipientTypeId,
    recipientIds,
    createdBy,
  });

  const response: CreateNotificationsResponse = result;

  return c.json(
    successResponse(response, STANDARD_MESSAGES.AUTH.CUSTOMER_CREATED),
    HttpStatusCodes.CREATED,
  );
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const notifications = await notificationsService.getNotificationsById(id);
  const typedResponse: GetNotificationsResponse = notifications;
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
  // Use notifications service to update the notifications
  const updatedNotifications = await notificationsService.updateNotifications(
    id,
    data,
  );

  const response = successResponse(
    updatedNotifications,
    "Notifications updated successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const removeSelected: AppRouteHandler<RemoveSelectedRoute> = async (
  c,
) => {
  const { ids } = c.req.valid("json");
  const payload = c.get("accessTokenPayload");
  const deletedBy = payload.userId;
  // Use notifications service to delete multiple notifications
  await notificationsService.deleteNotifications(ids, deletedBy);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const getNotificationTypes: AppRouteHandler<
  GetNotificationTypesRoute
> = async (c) => {
  const result = await notificationsService.getNotificationTypes();
  const response = successResponse(
    result,
    "Notification types retrieved successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const getNotificationFrequencies: AppRouteHandler<
  GetNotificationFrequenciesRoute
> = async (c) => {
  const result = await notificationsService.getNotificationFrequencies();
  const response = successResponse(
    result,
    "Notification frequencies retrieved successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const getNotificationRecipientTypes: AppRouteHandler<
  GetNotificationRecipientTypes
> = async (c) => {
  const result = await notificationsService.getNotificationRecipientTypes();
  const response = successResponse(
    result,
    "Notification recipient types retrieved successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};
