import type { UpdateNotificationsRequest } from "./notifications.schema";

import type { NewNotifications } from "@/db/models/notifications";
import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import db from "@/db";
import { notifications } from "@/db/models";

import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for notifications-related database operations
 */
export class NotificationsRepository {
  /**
   * Find a notifications by ID
   *
   * @param id - Notifications ID
   * @returns The notifications object or null if not found
   */
  async findById(id: number) {
    const result = await db.query.notifications.findFirst({
      where: eq(notifications.id, id),
    });

    return result;
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
   * @param params.filters - Filters
   * @returns List of notifications and total count
   * @returns {{ data: Notifications[], total: number, searchableFields: string[] }} - List of notifications and total count
   */
  async list(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    const { search, page, limit, sortBy, sortOrder, filters } = params;

    // Define searchable fields for global search
    const searchableFields = [
      "title",
      "message",
      "notification_type_id",
      "notification_frequency_id",
      "recipient_type_id",
    ];

    // Prepare where conditions
    const filterCondition = createFilterConditions(notifications, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      notifications,
      search,
    );

    // Combine conditions
    const whereConditions = [];
    // add isDeleted condition in whereCondition
    whereConditions.push(eq(notifications.isDeleted, false));
    if (filterCondition) {
      whereConditions.push(filterCondition);
    }
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get pagination params
    const { limit: limitVal, offset } = getPaginationValues(page, limit);

    // Create sort condition
    const sortCondition = createSortCondition(notifications, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(notifications)
        .where(whereClause || sql`TRUE`);

      // Fetch data with filtering, pagination and sorting
      const notificationsData = await tx.query.notifications.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition
          ? [sortCondition]
          : [desc(notifications.createdAt)],
        with: {
          notificationType: true,
          notificationFrequency: true,
          recipientType: true,
        },
      });

      return { data: notificationsData, total: totalCount, searchableFields };
    });
  }

  /**
   * Create a new notifications
   *
   * @param tx - Transaction
   * @param notificationsData - Notifications data
   * @returns The created notifications object
   */
  async create(tx: TX, notificationsData: NewNotifications) {
    const [result] = await tx
      .insert(notifications)
      .values({
        ...notificationsData,
      })
      .returning();
    return result;
  }

  /**
   * Update a notifications
   *
   * @param tx - Transaction
   * @param id - FAQ ID to update
   * @param notificationsData - Notifications data
   * @returns The updated notifications object
   */
  async update(
    tx: TX,
    id: number,
    notificationsData: UpdateNotificationsRequest & { updatedBy: number },
  ) {
    const [result] = await tx
      .update(notifications)
      .set({
        ...notificationsData,
        updatedBy: notificationsData.updatedBy,
      })
      .where(eq(notifications.id, id))
      .returning();
    return result;
  }

  /**
   * Soft delete multiple notifications by setting isDeleted flag
   *
   * @param tx - Transaction object
   * @param ids - Array of notifications IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async softDeleteMany(tx: TX, ids: number[], deletedBy: number) {
    const result = await tx
      .update(notifications)
      .set({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy,
      })
      .where(inArray(notifications.id, ids))
      .returning();

    return result.length > 0;
  }

  /**
   * Get Notification Types
   *
   * @returns Notification Types
   */
  async getNotificationTypes() {
    return await db.query.notificationTypes.findMany();
  }

  /**
   * Get Notification Frequencies
   *
   * @returns Notification Frequencies
   */
  async getNotificationFrequencies() {
    return await db.query.notificationFrequencies.findMany();
  }

  /**
   * Get Notification Recipient Types
   *
   * @returns Notification Recipient Types
   */
  async getNotificationRecipientTypes() {
    return await db.query.recipientTypes.findMany();
  }
}
