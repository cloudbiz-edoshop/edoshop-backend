export enum OrderItemFulfillmentStatusType {
  PENDING = "pending",
  PARTIALLY_FULFILLED = "partially_fulfilled",
  FULLY_FULFILLED = "fully_fulfilled",
}

export const OrderItemFulfillmentStatusIds = {
  PENDING: 1,
  PARTIALLY_FULFILLED: 2,
  FULLY_FULFILLED: 3,
} as const;

export const ORDER_ITEM_FULFILLMENT_STATUS_DESCRIPTIONS: Record<OrderItemFulfillmentStatusType, string> = {
  [OrderItemFulfillmentStatusType.PENDING]: "No quantity has been packed yet (quantity_packed = 0)",
  [OrderItemFulfillmentStatusType.PARTIALLY_FULFILLED]: "Some quantity has been packed but not all (0 < quantity_packed < quantity)",
  [OrderItemFulfillmentStatusType.FULLY_FULFILLED]: "All ordered quantity has been packed (quantity_packed = quantity)",
};

export type OrderItemFulfillmentStatusId =
  (typeof OrderItemFulfillmentStatusIds)[keyof typeof OrderItemFulfillmentStatusIds];
