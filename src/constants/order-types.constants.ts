export enum OrderType {
  DIRECT_ORDER = "direct_order",
  DROPSHIPPING = "dropshipping",
}

export const OrderTypeIds = {
  DIRECT_ORDER: 1,
  DROPSHIPPING: 2,
} as const;

export const ORDER_TYPE_DESCRIPTIONS: Record<OrderType, string> = {
  [OrderType.DIRECT_ORDER]: "Direct Order",
  [OrderType.DROPSHIPPING]: "Dropshipping",
};
