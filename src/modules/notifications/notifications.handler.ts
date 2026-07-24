import type {
  CreateRoute,
  GetMyNotificationsRoute,
  GetMyNotificationSettingsRoute,
  GetMyUnreadNotificationCountRoute,
  GetNotificationFrequenciesRoute,
  GetNotificationRecipientTypes,
  GetNotificationTypesRoute,
  GetOneRoute,
  GetStaffNotificationsRoute,
  GetStaffUnreadNotificationCountRoute,
  ListRoute,
  MarkAllMyNotificationsReadRoute,
  MarkMyNotificationReadRoute,
  MarkStaffNotificationReadRoute,
  PatchRoute,
  RemoveSelectedRoute,
  UpdateMyNotificationSettingsRoute,
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
    sendWhatsapp,
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
    sendWhatsapp,
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

export const getMyNotifications: AppRouteHandler<GetMyNotificationsRoute> = async (c) => {
  const query = c.req.valid("query");
  const payload = c.get("accessTokenPayload");

  const result = await notificationsService.getMyNotifications({
    userId: payload.userId,
    page: query.page ?? 1,
    limit: query.limit ?? 20,
    unreadOnly: query.unreadOnly,
  });

  const pagination = createPagination(
    result.total,
    query.page ?? 1,
    query.limit ?? 20,
  );

  return c.json(
    successResponseWithPagination(
      result.data,
      pagination,
      [],
      "Notifications retrieved successfully",
    ),
    HttpStatusCodes.OK,
  );
};

export const getMyNotificationSettings: AppRouteHandler<GetMyNotificationSettingsRoute> = async (c) => {
  const payload = c.get("accessTokenPayload");
  const settings = await notificationsService.getMyNotificationSettings(
    payload.userId,
  );
  return c.json(
    successResponse(settings, "Notification settings retrieved successfully"),
    HttpStatusCodes.OK,
  );
};

export const updateMyNotificationSettings: AppRouteHandler<UpdateMyNotificationSettingsRoute> = async (c) => {
  const payload = c.get("accessTokenPayload");
  const { preferences } = c.req.valid("json");
  const settings = await notificationsService.updateMyNotificationSettings(
    payload.userId,
    preferences,
  );
  return c.json(
    successResponse(settings, "Notification settings updated successfully"),
    HttpStatusCodes.OK,
  );
};

export const markMyNotificationRead: AppRouteHandler<MarkMyNotificationReadRoute> = async (c) => {
  const payload = c.get("accessTokenPayload");
  const { id } = c.req.valid("param");
  const updated = await notificationsService.markMyNotificationRead(
    payload.userId,
    id,
  );
  return c.json(
    successResponse(updated, "Notification marked as read"),
    HttpStatusCodes.OK,
  );
};

export const markAllMyNotificationsRead: AppRouteHandler<MarkAllMyNotificationsReadRoute> = async (c) => {
  const payload = c.get("accessTokenPayload");
  await notificationsService.markAllMyNotificationsRead(payload.userId);
  return c.json(
    successResponse({ success: true }, "All notifications marked as read"),
    HttpStatusCodes.OK,
  );
};

export const getMyUnreadNotificationCount: AppRouteHandler<GetMyUnreadNotificationCountRoute> = async (c) => {
  const payload = c.get("accessTokenPayload");
  const count = await notificationsService.getMyUnreadNotificationCount(
    payload.userId,
  );
  return c.json(
    successResponse({ count }, "Unread notification count retrieved successfully"),
    HttpStatusCodes.OK,
  );
};

export const getStaffNotifications: AppRouteHandler<GetStaffNotificationsRoute> = async (c) => {
  const query = c.req.valid("query");
  const payload = c.get("accessTokenPayload");

  const result = await notificationsService.getStaffNotifications({
    userId: payload.userId,
    page: query.page ?? 1,
    limit: query.limit ?? 20,
    unreadOnly: query.unreadOnly,
  });

  const pagination = createPagination(
    result.total,
    query.page ?? 1,
    query.limit ?? 20,
  );

  return c.json(
    successResponseWithPagination(
      result.data,
      pagination,
      [],
      "Team notifications retrieved successfully",
    ),
    HttpStatusCodes.OK,
  );
};

export const markStaffNotificationRead: AppRouteHandler<MarkStaffNotificationReadRoute> = async (c) => {
  const payload = c.get("accessTokenPayload");
  const { id } = c.req.valid("param");
  const updated = await notificationsService.markMyNotificationRead(
    payload.userId,
    id,
  );
  return c.json(
    successResponse(updated, "Team notification marked as read"),
    HttpStatusCodes.OK,
  );
};

export const getStaffUnreadNotificationCount: AppRouteHandler<GetStaffUnreadNotificationCountRoute> = async (c) => {
  const payload = c.get("accessTokenPayload");
  const count = await notificationsService.getStaffUnreadNotificationCount(
    payload.userId,
  );
  return c.json(
    successResponse({ count }, "Unread team notification count retrieved successfully"),
    HttpStatusCodes.OK,
  );
};
