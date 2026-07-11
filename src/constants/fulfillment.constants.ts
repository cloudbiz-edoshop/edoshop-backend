export enum FulfillmentMethod {
  PICKUP = "pickup",
  DELIVERY = "delivery",
}

export const DIRECT_ORDER_DELIVERY_FEE_XAF = 2000;
export const DIRECT_ORDER_PICKUP_FEE_XAF = 0;

export const DIRECT_ORDER_DELIVERY_OPTIONS = [
  {
    id: 1,
    code: "standard",
    label: "Standard Delivery",
    fee: 2000,
  },
  {
    id: 2,
    code: "fast",
    label: "Fast Delivery",
    fee: 3500,
  },
  {
    id: 3,
    code: "express",
    label: "Express Delivery",
    fee: 5000,
  },
] as const;

export const getDirectOrderDeliveryOption = (shippingPriorityCodeId?: number | null) => {
  return (
    DIRECT_ORDER_DELIVERY_OPTIONS.find(
      (option) => option.id === Number(shippingPriorityCodeId),
    ) ?? DIRECT_ORDER_DELIVERY_OPTIONS[0]
  );
};

export const computeDirectOrderShippingFee = (
  fulfillmentMethod: FulfillmentMethod | string,
  shippingPriorityCodeId?: number | null,
) => {
  if (fulfillmentMethod === FulfillmentMethod.PICKUP) {
    return DIRECT_ORDER_PICKUP_FEE_XAF;
  }

  return getDirectOrderDeliveryOption(shippingPriorityCodeId).fee;
};
