export enum SHIPPING_TYPES {
  NORMAL = "normal",
  FRAGILE = "fragile",
}

export const SHIPPING_TYPES_IDS = {
  NORMAL: 1,
  FRAGILE: 2,
} as const;

export const SHIPPING_TYPES_DESCRIPTIONS: Record<SHIPPING_TYPES, string> = {
  [SHIPPING_TYPES.NORMAL]: "Normal Shipping",
  [SHIPPING_TYPES.FRAGILE]: "Fragile Item Shipping",
};
