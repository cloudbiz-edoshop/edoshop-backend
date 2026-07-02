export enum FulfillmentMethod {
  PICKUP = "pickup",
  DELIVERY = "delivery",
}

export const DIRECT_ORDER_DELIVERY_FEE_XAF = 2000;
export const DIRECT_ORDER_PICKUP_FEE_XAF = 0;

export const computeDirectOrderShippingFee = (
  fulfillmentMethod: FulfillmentMethod | string,
) => {
  return fulfillmentMethod === FulfillmentMethod.PICKUP
    ? DIRECT_ORDER_PICKUP_FEE_XAF
    : DIRECT_ORDER_DELIVERY_FEE_XAF;
};
