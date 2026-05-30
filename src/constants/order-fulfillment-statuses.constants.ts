export enum OrderFulfillmentStatusType {
  PENDING = "pending",
  PARTIALLY_FULFILLED = "partially_fulfilled",
  FULLY_FULFILLED = "fully_fulfilled",
}

export const ORDER_FULFILLMENT_STATUS_DESCRIPTIONS: Record<OrderFulfillmentStatusType, string> = {
  [OrderFulfillmentStatusType.PENDING]: "All order items are pending (no items have been packed)",
  [OrderFulfillmentStatusType.PARTIALLY_FULFILLED]: "At least one item is partially or fully fulfilled, but not all items are fully fulfilled",
  [OrderFulfillmentStatusType.FULLY_FULFILLED]: "All order items are fully fulfilled (all quantities have been packed)",
};
