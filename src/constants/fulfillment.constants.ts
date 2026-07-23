export enum FulfillmentMethod {
  PICKUP = "pickup",
  DELIVERY = "delivery",
}

export const DIRECT_ORDER_DELIVERY_FEE_XAF = 2000;
export const DIRECT_ORDER_PICKUP_FEE_XAF = 0;

export const EDOSHOP_STORE_COORDINATES = {
  latitude: 4.0519857,
  longitude: 9.7668418,
} as const;

export const DIRECT_ORDER_DELIVERY_OPTIONS = [
  {
    id: 1,
    code: "standard",
    label: "Standard Delivery",
    leadTime: "2-3 business days",
    description: "Best value option for regular delivery.",
    fee: 2000,
  },
  {
    id: 2,
    code: "fast",
    label: "Fast Delivery",
    leadTime: "24-48 hours",
    description: "Faster handling for customers who need the order sooner.",
    fee: 3500,
  },
  {
    id: 3,
    code: "express",
    label: "Express Delivery",
    leadTime: "Same day or next day",
    description: "Priority delivery, subject to location and order time.",
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
