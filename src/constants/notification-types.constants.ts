/**
 * Notification types available in the application
 * Using enum for better type safety and autocompletion
 */

// - Request approved
// - New arrivals : Drop-shipping store
// - New arrivals : Direct store
// - Clearance
// - Promotion
// - Groupage almost closing
// - Join a different groupage
// - Reminder to proceed with payments
// - Pay your custom and shipping fees
// - Orders Arrived at Edoshop store
// - Reminder to collect your package
// - Welcome to Edoshop
// - Warning
// - Account canceled

export enum NotificationType {
  REQUEST_APPROVED = "request_approved",
  NEW_ARRIVALS_DROP_SHIPPING_STORE = "new_arrivals_drop_shipping_store",
  NEW_ARRIVALS_DIRECT_STORE = "new_arrivals_direct_store",
  CLEARANCE = "clearance",
  PROMOTION = "promotion",
  GROUPAGE_ALMOST_CLOSING = "groupage_almost_closing",
  JOIN_A_DIFFERENT_GROUPAGE = "join_a_different_groupage",
  REMINDER_TO_PROCEED_WITH_PAYMENTS = "reminder_to_proceed_with_payments",
  PAY_YOUR_CUSTOM_AND_SHIPPING_FEES = "pay_your_custom_and_shipping_fees",
  ORDERS_ARRIVED_AT_EDOSHOP_STORE = "orders_arrived_at_edoshop_store",
  REMINDER_TO_COLLECT_YOUR_PACKAGE = "reminder_to_collect_your_package",
  WELCOME_TO_EDOSHOP = "welcome_to_edoshop",
  WARNING = "warning",
  ACCOUNT_CANCELED = "account_canceled",
}

export const NotificationTypeIds = {
  REQUEST_APPROVED: 1,
  NEW_ARRIVALS_DROP_SHIPPING_STORE: 2,
  NEW_ARRIVALS_DIRECT_STORE: 3,
  CLEARANCE: 4,
  PROMOTION: 5,
  GROUPAGE_ALMOST_CLOSING: 6,
  JOIN_A_DIFFERENT_GROUPAGE: 7,
  REMINDER_TO_PROCEED_WITH_PAYMENTS: 8,
  PAY_YOUR_CUSTOM_AND_SHIPPING_FEES: 9,
  ORDERS_ARRIVED_AT_EDOSHOP_STORE: 10,
  REMINDER_TO_COLLECT_YOUR_PACKAGE: 11,
  WELCOME_TO_EDOSHOP: 12,
  WARNING: 13,
  ACCOUNT_CANCELED: 14,
} as const;

/**
 * Provides descriptions for notification types
 */
export const NOTIFICATION_TYPE_DESCRIPTIONS: Record<NotificationType, string> =
  {
    [NotificationType.REQUEST_APPROVED]: "Request Approved",
    [NotificationType.NEW_ARRIVALS_DROP_SHIPPING_STORE]:
      "New Arrivals Drop-Shipping Store",
    [NotificationType.NEW_ARRIVALS_DIRECT_STORE]: "New Arrivals Direct Store",
    [NotificationType.CLEARANCE]: "Clearance",
    [NotificationType.PROMOTION]: "Promotion",
    [NotificationType.GROUPAGE_ALMOST_CLOSING]: "Groupage Almost Closing",
    [NotificationType.JOIN_A_DIFFERENT_GROUPAGE]: "Join a Different Groupage",
    [NotificationType.REMINDER_TO_PROCEED_WITH_PAYMENTS]:
      "Reminder to Proceed with Payments",
    [NotificationType.PAY_YOUR_CUSTOM_AND_SHIPPING_FEES]:
      "Pay Your Custom and Shipping Fees",
    [NotificationType.ORDERS_ARRIVED_AT_EDOSHOP_STORE]:
      "Orders Arrived at Edoshop Store",
    [NotificationType.REMINDER_TO_COLLECT_YOUR_PACKAGE]:
      "Reminder to Collect Your Package",
    [NotificationType.WELCOME_TO_EDOSHOP]: "Welcome to Edoshop",
    [NotificationType.WARNING]: "Warning",
    [NotificationType.ACCOUNT_CANCELED]: "Account Canceled",
  };
