import type {
  CreateNotificationsRequest,
  CreateNotificationsResponse,
  UpdateNotificationsRequest,
} from "./notifications.schema";
import { NotFoundError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";

import db from "@/db";

import { notificationDeliveryService } from "./notification-delivery.service";
import { NotificationsRepository } from "./notifications.repository";
import { NotificationAudience } from "@/constants/notification-audience.constants";

export class NotificationsService {
  private readonly notificationsRepository: NotificationsRepository;

  /**
   * Create a new NotificationsService
   * Initializes the notifications repository for database operations
   */
  constructor() {
    this.notificationsRepository = new NotificationsRepository();
  }

  /**
   * Create a new notifications
   *
   * @param notificationsData - Notifications data
   * @returns The created notifications object
   */
  async createNotifications(
    notificationsData: CreateNotificationsRequest & {
      createdBy: number;
    },
  ): Promise<CreateNotificationsResponse> {
    const { recipientIds, sendWhatsapp, ...notificationPayload } =
      notificationsData;

    const notifications = await db.transaction(async (tx) => {
      const notifications = await this.notificationsRepository.create(tx, {
        ...notificationPayload,
        updatedBy: notificationsData.createdBy,
      });

      return notifications;
    });

    if (recipientIds?.length) {
      await notificationDeliveryService.saveNotificationRecipients(
        notifications.id,
        recipientIds,
      );
    }

    await notificationDeliveryService.publishNotification({
      notificationId: notifications.id,
      recipientTypeId: notificationsData.recipientTypeId,
      recipientIds,
      sendWhatsapp: sendWhatsapp !== false,
    });

    // fetch notifications
    const notificationsWithAttributeType =
      await this.notificationsRepository.findById(notifications.id);
    if (!notificationsWithAttributeType) {
      throw new AppError("Notifications could not be fetched after creation");
    }
    return notificationsWithAttributeType as CreateNotificationsResponse;
  }

  /**
   * List notifications with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters to apply
   * @returns List of suppliers and total count
   */
  async listNotifications(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return await this.notificationsRepository.list(params);
  }

  /**
   * Get a notifications by id
   *
   * @param id - Notifications id
   * @returns The notifications object
   */
  async getNotificationsById(id: number) {
    const notifications = await this.notificationsRepository.findById(id);
    if (!notifications) {
      throw new NotFoundError("Notifications not found");
    }
    return notifications;
  }

  /**
   * Update a notifications
   *
   * @param id - Notifications id
   * @param notificationsData - Notifications data
   * @returns The updated notifications object
   */
  async updateNotifications(
    id: number,
    notificationsData: UpdateNotificationsRequest & {
      updatedBy: number;
    },
  ) {
    const notifications = await this.notificationsRepository.findById(id);

    if (!notifications) {
      throw new NotFoundError("Notifications not found");
    }

    await db.transaction(async (tx) => {
      // Update notifications
      await this.notificationsRepository.update(tx, id, {
        ...notificationsData,
        updatedBy: notificationsData.updatedBy,
      });
    });
    // fetch notifications
    const notificationsWithAttributeType =
      await this.notificationsRepository.findById(notifications.id);
    if (!notificationsWithAttributeType) {
      throw new AppError("Notifications could not be fetched after update");
    }
    return notificationsWithAttributeType as CreateNotificationsResponse;
  }

  /**
   * Delete multiple notifications
   *
   * @param ids - Array of notifications IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async deleteNotifications(ids: number[], deletedBy: number) {
    const result = await db.transaction(async (tx) => {
      return await this.notificationsRepository.softDeleteMany(
        tx,
        ids,
        deletedBy,
      );
    });
    if (!result) {
      throw new AppError("Failed to delete notifications");
    }
    return result;
  }

  /**
   * Get Notification Types
   *
   * @returns Notification Types
   */
  async getNotificationTypes() {
    return await this.notificationsRepository.getNotificationTypes();
  }

  /**
   * Get Notification Frequencies
   *
   * @returns Notification Frequencies
   */
  async getNotificationFrequencies() {
    return await this.notificationsRepository.getNotificationFrequencies();
  }

  /**
   * Get Notification Recipient Types
   *
   * @returns Notification Recipient Types
   */
  async getNotificationRecipientTypes() {
    return await this.notificationsRepository.getNotificationRecipientTypes();
  }

  async getMyNotifications(params: {
    userId: number;
    page: number;
    limit: number;
    unreadOnly?: boolean;
  }) {
    return notificationDeliveryService.listUserNotifications({
      ...params,
      audience: NotificationAudience.CUSTOMER,
    });
  }

  async getStaffNotifications(params: {
    userId: number;
    page: number;
    limit: number;
    unreadOnly?: boolean;
  }) {
    return notificationDeliveryService.listUserNotifications({
      ...params,
      audience: NotificationAudience.STAFF,
    });
  }

  async getMyNotificationSettings(userId: number) {
    return notificationDeliveryService.getUserPreferences(userId);
  }

  async updateMyNotificationSettings(
    userId: number,
    updates: Array<{ preferenceKey: string; enabled: boolean }>,
  ) {
    return notificationDeliveryService.updateUserPreferences(userId, updates);
  }

  async markMyNotificationRead(userId: number, deliveryId: number) {
    const updated = await notificationDeliveryService.markNotificationRead(
      userId,
      deliveryId,
    );
    if (!updated) {
      throw new NotFoundError("Notification not found");
    }
    return updated;
  }

  async markAllMyNotificationsRead(userId: number) {
    await notificationDeliveryService.markAllNotificationsRead(userId);
  }

  async getMyUnreadNotificationCount(userId: number) {
    return notificationDeliveryService.getUnreadCount(
      userId,
      NotificationAudience.CUSTOMER,
    );
  }

  async getStaffUnreadNotificationCount(userId: number) {
    return notificationDeliveryService.getUnreadCount(
      userId,
      NotificationAudience.STAFF,
    );
  }
}
