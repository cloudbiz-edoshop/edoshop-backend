import { NotificationTypeIds } from "./notification-types.constants";
import { NotificationPreferenceKey } from "./notification-preferences.constants";

export const NOTIFICATION_TYPE_PREFERENCE_MAP: Record<
  number,
  NotificationPreferenceKey
> = {
  [NotificationTypeIds.REQUEST_APPROVED]:
    NotificationPreferenceKey.DROPSHIP_AWAITING_PAYMENT,
  [NotificationTypeIds.NEW_ARRIVALS_DROP_SHIPPING_STORE]:
    NotificationPreferenceKey.DROPSHIP_NEW_ITEMS,
  [NotificationTypeIds.NEW_ARRIVALS_DIRECT_STORE]:
    NotificationPreferenceKey.DIRECT_NEW_ARRIVALS,
  [NotificationTypeIds.CLEARANCE]: NotificationPreferenceKey.DIRECT_PROMOTIONS,
  [NotificationTypeIds.PROMOTION]: NotificationPreferenceKey.DIRECT_PROMOTIONS,
  [NotificationTypeIds.GROUPAGE_ALMOST_CLOSING]:
    NotificationPreferenceKey.DROPSHIP_ALMOST_COMPLETE,
  [NotificationTypeIds.JOIN_A_DIFFERENT_GROUPAGE]:
    NotificationPreferenceKey.DROPSHIP_NEW_GROUPAGE,
  [NotificationTypeIds.REMINDER_TO_PROCEED_WITH_PAYMENTS]:
    NotificationPreferenceKey.DROPSHIP_AWAITING_PAYMENT,
  [NotificationTypeIds.PAY_YOUR_CUSTOM_AND_SHIPPING_FEES]:
    NotificationPreferenceKey.DROPSHIP_AWAITING_PAYMENT,
  [NotificationTypeIds.ORDERS_ARRIVED_AT_EDOSHOP_STORE]:
    NotificationPreferenceKey.DELIVERY_TRACKING,
  [NotificationTypeIds.REMINDER_TO_COLLECT_YOUR_PACKAGE]:
    NotificationPreferenceKey.DELIVERY_TRACKING,
  [NotificationTypeIds.WELCOME_TO_EDOSHOP]:
    NotificationPreferenceKey.SEASONAL_WISHES,
  [NotificationTypeIds.WARNING]: NotificationPreferenceKey.ACCOUNT_WARNING,
  [NotificationTypeIds.ACCOUNT_CANCELED]:
    NotificationPreferenceKey.ACCOUNT_WARNING,
};

export const getPreferenceKeyForNotificationType = (
  notificationTypeId: number,
): NotificationPreferenceKey => {
  return (
    NOTIFICATION_TYPE_PREFERENCE_MAP[notificationTypeId] ??
    NotificationPreferenceKey.APP_MAINTENANCE
  );
};
