import { and, desc, eq, inArray, sql } from "drizzle-orm";

import {
  ALL_NOTIFICATION_PREFERENCE_KEYS,
  DEFAULT_ENABLED_PREFERENCE_KEYS,
  MANDATORY_NOTIFICATION_PREFERENCE_KEYS,
  type NotificationPreferenceKey,
} from "@/constants/notification-preferences.constants";
import { getPreferenceKeyForNotificationType } from "@/constants/notification-type-preferences.constants";
import { RecipientTypeIds } from "@/constants/recipient-types.constants";
import { NotificationAudience } from "@/constants/notification-audience.constants";
import { toUtcIsoString } from "@/lib/utc-timestamp";
import db from "@/db";
import {
  customers,
  employees,
  entities,
  notificationRecipients,
  notifications,
  operations,
  orders,
  permissions,
  roles,
  userNotificationDeliveries,
  userNotificationPreferences,
  users,
} from "@/db/models";
import { sendWhatsapp } from "@/lib/send-whatsapp";

type DeliveryChannel = "webapp" | "whatsapp";

type DeliverNotificationInput = {
  notificationId?: number;
  userId: number;
  title: string;
  message: string;
  notificationTypeId: number;
  channels?: DeliveryChannel[];
  actionUrl?: string | null;
  referenceType?: string | null;
  referenceId?: number | null;
  audience?: NotificationAudience | string;
};

export class NotificationDeliveryService {
  async initializeUserPreferences(userId: number) {
    const rows = ALL_NOTIFICATION_PREFERENCE_KEYS.map((preferenceKey) => ({
      userId,
      preferenceKey,
      enabled: DEFAULT_ENABLED_PREFERENCE_KEYS.has(preferenceKey),
      updatedAt: new Date().toISOString(),
    }));

    await db
      .insert(userNotificationPreferences)
      .values(rows)
      .onConflictDoNothing({
        target: [
          userNotificationPreferences.userId,
          userNotificationPreferences.preferenceKey,
        ],
      });
  }

  async getUserPreferences(userId: number) {
    await this.initializeUserPreferences(userId);

    const stored = await db.query.userNotificationPreferences.findMany({
      where: eq(userNotificationPreferences.userId, userId),
    });

    const preferenceMap = new Map(
      stored.map((row) => [row.preferenceKey, row.enabled]),
    );

    return ALL_NOTIFICATION_PREFERENCE_KEYS.map((preferenceKey) => ({
      preferenceKey,
      enabled: MANDATORY_NOTIFICATION_PREFERENCE_KEYS.has(preferenceKey)
        ? true
        : (preferenceMap.get(preferenceKey) ??
          DEFAULT_ENABLED_PREFERENCE_KEYS.has(preferenceKey)),
      mandatory: MANDATORY_NOTIFICATION_PREFERENCE_KEYS.has(preferenceKey),
    }));
  }

  async updateUserPreferences(
    userId: number,
    updates: Array<{ preferenceKey: string; enabled: boolean }>,
  ) {
    await this.initializeUserPreferences(userId);

    for (const update of updates) {
      if (
        MANDATORY_NOTIFICATION_PREFERENCE_KEYS.has(
          update.preferenceKey as NotificationPreferenceKey,
        )
      ) {
        continue;
      }

      if (!ALL_NOTIFICATION_PREFERENCE_KEYS.includes(update.preferenceKey as NotificationPreferenceKey)) {
        continue;
      }

      await db
        .insert(userNotificationPreferences)
        .values({
          userId,
          preferenceKey: update.preferenceKey,
          enabled: update.enabled,
          updatedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: [
            userNotificationPreferences.userId,
            userNotificationPreferences.preferenceKey,
          ],
          set: {
            enabled: update.enabled,
            updatedAt: new Date().toISOString(),
          },
        });
    }

    return this.getUserPreferences(userId);
  }

  async isUserOptedIn(userId: number, preferenceKey: NotificationPreferenceKey) {
    if (MANDATORY_NOTIFICATION_PREFERENCE_KEYS.has(preferenceKey)) {
      return true;
    }

    const preference = await db.query.userNotificationPreferences.findFirst({
      where: and(
        eq(userNotificationPreferences.userId, userId),
        eq(userNotificationPreferences.preferenceKey, preferenceKey),
      ),
    });

    if (!preference) {
      return DEFAULT_ENABLED_PREFERENCE_KEYS.has(preferenceKey);
    }

    return preference.enabled;
  }

  async resolveRecipientUserIds(params: {
    recipientTypeId: number;
    recipientIds?: number[];
  }) {
    const { recipientTypeId, recipientIds = [] } = params;

    if (recipientTypeId === RecipientTypeIds.INDIVIDUALS) {
      return [...new Set(recipientIds.filter(Boolean))];
    }

    const activeCustomers = await db
      .select({ userId: customers.userId })
      .from(customers)
      .innerJoin(users, eq(customers.userId, users.id))
      .where(
        and(eq(customers.isDeleted, false), eq(customers.isActive, true)),
      );

    const allUserIds = activeCustomers.map((row) => row.userId);

    if (recipientTypeId === RecipientTypeIds.ALL_CUSTOMERS) {
      return allUserIds;
    }

    if (recipientTypeId === RecipientTypeIds.DIRECT_STORE_ORDERS) {
      const directOrderCustomers = await db
        .selectDistinct({ customerId: orders.customerId })
        .from(orders)
        .where(eq(orders.isDeleted, false));

      const customerUserIds = await db
        .select({ userId: customers.userId })
        .from(customers)
        .where(
          inArray(
            customers.id,
            directOrderCustomers
              .map((row) => row.customerId)
              .filter(Boolean),
          ),
        );

      return customerUserIds.map((row) => row.userId);
    }

    if (recipientTypeId === RecipientTypeIds.DROP_SHIPPING_STORE_ORDERS) {
      return allUserIds;
    }

    if (
      recipientTypeId === RecipientTypeIds.DELIVERY_REQUESTS ||
      recipientTypeId === RecipientTypeIds.EACH_STEP_OF_THE_TRACKER
    ) {
      return allUserIds;
    }

    if (
      recipientTypeId === RecipientTypeIds.ONGOING_GROUPS ||
      recipientTypeId === RecipientTypeIds.REJECTED_GROUPS ||
      recipientTypeId === RecipientTypeIds.REQUEST_APPROVED_CHECKOUT_DELAYING
    ) {
      return recipientIds.length ? [...new Set(recipientIds)] : [];
    }

    return allUserIds;
  }

  async listEmployeeUserIdsByPermission(
    entityName: string,
    operationName: string,
  ) {
    const rows = await db
      .select({ userId: employees.userId })
      .from(employees)
      .innerJoin(roles, eq(employees.roleId, roles.id))
      .innerJoin(permissions, eq(permissions.roleId, roles.id))
      .innerJoin(entities, eq(permissions.entityId, entities.id))
      .innerJoin(operations, eq(permissions.operationId, operations.id))
      .innerJoin(users, eq(employees.userId, users.id))
      .where(
        and(
          eq(employees.isDeleted, false),
          eq(employees.isActive, true),
          eq(entities.name, entityName),
          sql`lower(${operations.name}) = lower(${operationName})`,
        ),
      );

    return [...new Set(rows.map((row) => row.userId))];
  }

  async deliverToUser(input: DeliverNotificationInput) {
    const {
      notificationId,
      userId,
      title,
      message,
      notificationTypeId,
      channels = ["webapp", "whatsapp"],
      actionUrl,
      referenceType,
      referenceId,
      audience = NotificationAudience.CUSTOMER,
    } = input;

    const categoryKey = getPreferenceKeyForNotificationType(notificationTypeId);
    const optedIn = await this.isUserOptedIn(userId, categoryKey);

    if (!optedIn) {
      return { delivered: false, reason: "opted_out" as const };
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return { delivered: false, reason: "user_not_found" as const };
    }

    if (channels.includes("webapp")) {
      await db
        .insert(userNotificationDeliveries)
        .values({
          notificationId: notificationId ?? null,
          userId,
          title,
          message: message.slice(0, 255),
          categoryKey,
          channel: "webapp",
          actionUrl: actionUrl ?? null,
          referenceType: referenceType ?? null,
          referenceId: referenceId ?? null,
          audience,
          isActive: true,
          sentAt: new Date().toISOString(),
        })
        .onConflictDoNothing({
          target: [
            userNotificationDeliveries.notificationId,
            userNotificationDeliveries.userId,
            userNotificationDeliveries.channel,
          ],
        });
    }

    if (channels.includes("whatsapp") && user.phoneNumber) {
      try {
        await sendWhatsapp({
          phoneNumber: user.phoneNumber,
          message: `${title}\n\n${message}`,
        });

        await db
          .insert(userNotificationDeliveries)
          .values({
            notificationId: notificationId ?? null,
            userId,
            title,
            message: message.slice(0, 255),
            categoryKey,
            channel: "whatsapp",
            audience,
            sentAt: new Date().toISOString(),
          })
          .onConflictDoNothing({
            target: [
              userNotificationDeliveries.notificationId,
              userNotificationDeliveries.userId,
              userNotificationDeliveries.channel,
            ],
          });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to send WhatsApp notification", error);
      }
    }

    return { delivered: true as const };
  }

  async publishNotification(params: {
    notificationId: number;
    recipientTypeId: number;
    recipientIds?: number[];
    sendWhatsapp?: boolean;
  }) {
    const notification = await db.query.notifications.findFirst({
      where: eq(notifications.id, params.notificationId),
    });

    if (!notification) {
      return { deliveredCount: 0 };
    }

    const userIds = await this.resolveRecipientUserIds({
      recipientTypeId: params.recipientTypeId,
      recipientIds: params.recipientIds,
    });

    let deliveredCount = 0;

    for (const userId of userIds) {
      const result = await this.deliverToUser({
        notificationId: notification.id,
        userId,
        title: notification.title,
        message: notification.message,
        notificationTypeId: notification.notificationTypeId,
        channels: params.sendWhatsapp === false ? ["webapp"] : ["webapp", "whatsapp"],
      });

      if (result.delivered) {
        deliveredCount += 1;
      }
    }

    await db
      .update(notifications)
      .set({
        status: "sent",
        lastSentAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(notifications.id, notification.id));

    return { deliveredCount, recipientCount: userIds.length };
  }

  async saveNotificationRecipients(
    notificationId: number,
    recipientIds: number[],
  ) {
    if (!recipientIds.length) return;

    await db.insert(notificationRecipients).values(
      recipientIds.map((userId) => ({
        notificationId,
        userId,
      })),
    );
  }

  private buildAudienceCondition(audience: NotificationAudience) {
    if (audience === NotificationAudience.STAFF) {
      return eq(userNotificationDeliveries.audience, NotificationAudience.STAFF);
    }

    return eq(userNotificationDeliveries.audience, NotificationAudience.CUSTOMER);
  }

  async listUserNotifications(params: {
    userId: number;
    page: number;
    limit: number;
    unreadOnly?: boolean;
    audience?: NotificationAudience;
  }) {
    const {
      userId,
      page,
      limit,
      unreadOnly,
      audience = NotificationAudience.CUSTOMER,
    } = params;
    const offset = (page - 1) * limit;

    const whereClause = unreadOnly
      ? and(
          eq(userNotificationDeliveries.userId, userId),
          eq(userNotificationDeliveries.channel, "webapp"),
          eq(userNotificationDeliveries.isActive, true),
          eq(userNotificationDeliveries.isRead, false),
          this.buildAudienceCondition(audience),
        )
      : and(
          eq(userNotificationDeliveries.userId, userId),
          eq(userNotificationDeliveries.channel, "webapp"),
          eq(userNotificationDeliveries.isActive, true),
          this.buildAudienceCondition(audience),
        );

    const rows = await db.query.userNotificationDeliveries.findMany({
      where: whereClause,
      orderBy: [desc(userNotificationDeliveries.sentAt)],
      limit,
      offset,
    });

    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userNotificationDeliveries)
      .where(whereClause);

    return {
      data: rows.map((row) => ({
        ...row,
        sentAt: toUtcIsoString(row.sentAt) ?? row.sentAt,
        readAt: row.readAt ? toUtcIsoString(row.readAt) : null,
        createdAt: toUtcIsoString(row.createdAt) ?? row.createdAt,
        deactivatedAt: row.deactivatedAt
          ? toUtcIsoString(row.deactivatedAt)
          : null,
      })),
      total,
    };
  }

  async markNotificationRead(userId: number, deliveryId: number) {
    const [updated] = await db
      .update(userNotificationDeliveries)
      .set({
        isRead: true,
        readAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(userNotificationDeliveries.id, deliveryId),
          eq(userNotificationDeliveries.userId, userId),
        ),
      )
      .returning();

    return updated ?? null;
  }

  async markAllNotificationsRead(
    userId: number,
    audience?: NotificationAudience,
  ) {
    const conditions = [
      eq(userNotificationDeliveries.userId, userId),
      eq(userNotificationDeliveries.channel, "webapp"),
      eq(userNotificationDeliveries.isRead, false),
    ];

    if (audience) {
      conditions.push(this.buildAudienceCondition(audience));
    }

    await db
      .update(userNotificationDeliveries)
      .set({
        isRead: true,
        readAt: new Date().toISOString(),
      })
      .where(and(...conditions));
  }

  async getUnreadCount(
    userId: number,
    audience: NotificationAudience = NotificationAudience.CUSTOMER,
  ) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userNotificationDeliveries)
      .where(
        and(
          eq(userNotificationDeliveries.userId, userId),
          eq(userNotificationDeliveries.channel, "webapp"),
          eq(userNotificationDeliveries.isActive, true),
          eq(userNotificationDeliveries.isRead, false),
          this.buildAudienceCondition(audience),
        ),
      );

    return count;
  }

  async deactivateNotificationsByReference(params: {
    referenceType: string;
    referenceId: number;
    userIds?: number[];
    titles?: string[];
  }) {
    const conditions = [
      eq(userNotificationDeliveries.referenceType, params.referenceType),
      eq(userNotificationDeliveries.referenceId, params.referenceId),
      eq(userNotificationDeliveries.isActive, true),
    ];

    if (params.userIds?.length) {
      conditions.push(inArray(userNotificationDeliveries.userId, params.userIds));
    }

    if (params.titles?.length) {
      conditions.push(inArray(userNotificationDeliveries.title, params.titles));
    }

    await db
      .update(userNotificationDeliveries)
      .set({
        isActive: false,
        deactivatedAt: new Date().toISOString(),
      })
      .where(and(...conditions));
  }
}

export const notificationDeliveryService = new NotificationDeliveryService();
