export enum FULFILLMENT_STATES {
  PENDING = "pending",
  PICKED = "picked",
  PACKED = "packed",
  STAGED = "staged",
  READY_FOR_TRANSFER = "ready_for_transfer",
  IN_TRANSIT = "in_transit",
  RECEIVED = "received",
  DELIVERED = "delivered",
}

export const FULFILLMENT_STATES_STEPS: Record<FULFILLMENT_STATES, number> = {
  [FULFILLMENT_STATES.PENDING]: 1,
  [FULFILLMENT_STATES.PICKED]: 2,
  [FULFILLMENT_STATES.PACKED]: 3,
  [FULFILLMENT_STATES.STAGED]: 4,
  [FULFILLMENT_STATES.READY_FOR_TRANSFER]: 5,
  [FULFILLMENT_STATES.IN_TRANSIT]: 6,
  [FULFILLMENT_STATES.RECEIVED]: 7,
  [FULFILLMENT_STATES.DELIVERED]: 8,
};

export const FULFILLMENT_STATES_DESCRIPTIONS: Record<FULFILLMENT_STATES, string> = {
  [FULFILLMENT_STATES.PENDING]: "Waiting to be picked",
  [FULFILLMENT_STATES.PICKED]: "Picked from shelf",
  [FULFILLMENT_STATES.PACKED]: "Packed into package",
  [FULFILLMENT_STATES.STAGED]: "Staged for transfer",
  [FULFILLMENT_STATES.READY_FOR_TRANSFER]: "Ready for transfer",
  [FULFILLMENT_STATES.IN_TRANSIT]: "In transit between warehouses",
  [FULFILLMENT_STATES.RECEIVED]: "Received at destination warehouse",
  [FULFILLMENT_STATES.DELIVERED]: "Delivered to customer",
};
