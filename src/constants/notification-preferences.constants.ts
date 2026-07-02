export enum NotificationPreferenceKey {
  PROFILE_UPDATE = "profile_update",
  ACCOUNT_WARNING = "account_warning",
  APP_MAINTENANCE = "app_maintenance",
  SEASONAL_WISHES = "seasonal_wishes",
  PROMO_GIFT = "promo_gift",
  DIRECT_PAYMENT_CONFIRMATION = "direct_payment_confirmation",
  DIRECT_NEW_ARRIVALS = "direct_new_arrivals",
  DIRECT_PROMOTIONS = "direct_promotions",
  DROPSHIP_NEW_GROUPAGE = "dropship_new_groupage",
  DROPSHIP_ALMOST_COMPLETE = "dropship_almost_complete",
  DROPSHIP_ALMOST_REJECTED = "dropship_almost_rejected",
  DROPSHIP_APPROVED_REJECTED = "dropship_approved_rejected",
  DROPSHIP_PROMOTIONS = "dropship_promotions",
  DROPSHIP_NEW_ITEMS = "dropship_new_items",
  DROPSHIP_AWAITING_PAYMENT = "dropship_awaiting_payment",
  DELIVERY_TRACKING = "delivery_tracking",
  DELIVERY_COMPLETED = "delivery_completed",
}

export type NotificationPreferenceGroup = {
  id: string;
  title: string;
  description: string;
  mandatory: boolean;
  defaultEnabled: boolean;
  items: Array<{
    key: NotificationPreferenceKey;
    label: string;
  }>;
};

export const NOTIFICATION_PREFERENCE_GROUPS: NotificationPreferenceGroup[] = [
  {
    id: "general",
    title: "General Notifications",
    description:
      "Always on — required for your account, security, and essential platform updates.",
    mandatory: true,
    defaultEnabled: true,
    items: [
      {
        key: NotificationPreferenceKey.PROFILE_UPDATE,
        label: "Update profile with photo and address",
      },
      {
        key: NotificationPreferenceKey.ACCOUNT_WARNING,
        label: "Account warnings and cancellations",
      },
      {
        key: NotificationPreferenceKey.APP_MAINTENANCE,
        label: "App updates and maintenance downtime",
      },
      {
        key: NotificationPreferenceKey.SEASONAL_WISHES,
        label: "Seasonal wishes (Christmas, New Year, etc.)",
      },
      {
        key: NotificationPreferenceKey.PROMO_GIFT,
        label: "Promo codes and gifts from Edoshop",
      },
    ],
  },
  {
    id: "direct_order",
    title: "Direct Order Store",
    description: "Payment, arrivals, and promotions from the Direct Order store.",
    mandatory: false,
    defaultEnabled: true,
    items: [
      {
        key: NotificationPreferenceKey.DIRECT_PAYMENT_CONFIRMATION,
        label: "Payment confirmation",
      },
      {
        key: NotificationPreferenceKey.DIRECT_NEW_ARRIVALS,
        label: "New arrivals",
      },
      {
        key: NotificationPreferenceKey.DIRECT_PROMOTIONS,
        label: "Promotions and best deals",
      },
    ],
  },
  {
    id: "dropshipping",
    title: "Drop-Shipping Store",
    description: "Groupage updates, approvals, and drop-shipping promotions.",
    mandatory: false,
    defaultEnabled: true,
    items: [
      {
        key: NotificationPreferenceKey.DROPSHIP_NEW_GROUPAGE,
        label: "New groupage created",
      },
      {
        key: NotificationPreferenceKey.DROPSHIP_ALMOST_COMPLETE,
        label: "Groupages about to complete",
      },
      {
        key: NotificationPreferenceKey.DROPSHIP_ALMOST_REJECTED,
        label: "Groupages about to be rejected",
      },
      {
        key: NotificationPreferenceKey.DROPSHIP_APPROVED_REJECTED,
        label: "Groupages approved or rejected",
      },
      {
        key: NotificationPreferenceKey.DROPSHIP_PROMOTIONS,
        label: "Promotions and best deals",
      },
      {
        key: NotificationPreferenceKey.DROPSHIP_NEW_ITEMS,
        label: "New items posted for groupage",
      },
      {
        key: NotificationPreferenceKey.DROPSHIP_AWAITING_PAYMENT,
        label: "Awaiting payment for approved groupages",
      },
    ],
  },
  {
    id: "delivery",
    title: "Delivery Notifications",
    description: "Order tracking updates and delivery confirmations.",
    mandatory: false,
    defaultEnabled: true,
    items: [
      {
        key: NotificationPreferenceKey.DELIVERY_TRACKING,
        label: "Order tracking steps",
      },
      {
        key: NotificationPreferenceKey.DELIVERY_COMPLETED,
        label: "Order delivered",
      },
    ],
  },
];

export const ALL_NOTIFICATION_PREFERENCE_KEYS = NOTIFICATION_PREFERENCE_GROUPS.flatMap(
  (group) => group.items.map((item) => item.key),
);

export const MANDATORY_NOTIFICATION_PREFERENCE_KEYS = new Set(
  NOTIFICATION_PREFERENCE_GROUPS.filter((group) => group.mandatory).flatMap(
    (group) => group.items.map((item) => item.key),
  ),
);

export const DEFAULT_ENABLED_PREFERENCE_KEYS = new Set(
  NOTIFICATION_PREFERENCE_GROUPS.filter((group) => group.defaultEnabled).flatMap(
    (group) => group.items.map((item) => item.key),
  ),
);
