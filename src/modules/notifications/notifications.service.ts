import type {
  CreateNotificationsRequest,
  CreateNotificationsResponse,
  UpdateNotificationsRequest,
} from "./notifications.schema";
import { NotFoundError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";

import db from "@/db";

import { NotificationsRepository } from "./notifications.repository";

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
    const notifications = await db.transaction(async (tx) => {
      // Create notifications
      const notifications = await this.notificationsRepository.create(tx, {
        ...notificationsData,
        updatedBy: notificationsData.createdBy,
      });

      return notifications;
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
}
