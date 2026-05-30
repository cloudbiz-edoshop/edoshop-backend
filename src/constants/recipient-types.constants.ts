/**
 * Recipient types available in the application
 * Using enum for better type safety and autocompletion
 */

// - Individuals
// - All customers
// - Drop-shipping Store orders
// - Direct Store orders
// - Delivery requests
// - Ongoing groups
// - Rejected groups
// - Request approved - Check-out delaying
// - Each step of the tracker

export enum RecipientType {
  INDIVIDUALS = "individuals",
  ALL_CUSTOMERS = "all_customers",
  DROP_SHIPPING_STORE_ORDERS = "drop_shipping_store_orders",
  DIRECT_STORE_ORDERS = "direct_store_orders",
  DELIVERY_REQUESTS = "delivery_requests",
  ONGOING_GROUPS = "ongoing_groups",
  REJECTED_GROUPS = "rejected_groups",
  REQUEST_APPROVED_CHECKOUT_DELAYING = "request_approved_checkout_delaying",
  EACH_STEP_OF_THE_TRACKER = "each_step_of_the_tracker",
}

export const RecipientTypeIds = {
  INDIVIDUALS: 1,
  ALL_CUSTOMERS: 2,
  DROP_SHIPPING_STORE_ORDERS: 3,
  DIRECT_STORE_ORDERS: 4,
  DELIVERY_REQUESTS: 5,
  ONGOING_GROUPS: 6,
  REJECTED_GROUPS: 7,
  REQUEST_APPROVED_CHECKOUT_DELAYING: 8,
  EACH_STEP_OF_THE_TRACKER: 9,
} as const;

/**
 * Provides descriptions for recipient types
 */
export const RECIPIENT_TYPE_DESCRIPTIONS: Record<RecipientType, string> = {
  [RecipientType.INDIVIDUALS]: "Individuals",
  [RecipientType.ALL_CUSTOMERS]: "All Customers",
  [RecipientType.DROP_SHIPPING_STORE_ORDERS]: "Drop-Shipping Store Orders",
  [RecipientType.DIRECT_STORE_ORDERS]: "Direct Store Orders",
  [RecipientType.DELIVERY_REQUESTS]: "Delivery Requests",
  [RecipientType.ONGOING_GROUPS]: "Ongoing Groups",
  [RecipientType.REJECTED_GROUPS]: "Rejected Groups",
  [RecipientType.REQUEST_APPROVED_CHECKOUT_DELAYING]:
    "Request Approved Checkout Delaying",
  [RecipientType.EACH_STEP_OF_THE_TRACKER]: "Each Step of the Tracker",
};
