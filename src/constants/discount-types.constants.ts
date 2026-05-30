/**
 * Discount types available in the application
 * Using enum for better type safety and autocompletion
 */
export enum DiscountType {
  PERCENTAGE = "percentage",
  FIXED_AMOUNT = "fixed_amount",
}

export const DiscountTypeIds = {
  PERCENTAGE: 1,
  FIXED_AMOUNT: 2,
} as const;

/**
 * Provides descriptions for discount types
 */
export const DISCOUNT_TYPE_DESCRIPTIONS: Record<DiscountType, string> = {
  [DiscountType.PERCENTAGE]:
    "Discount applied as a percentage of the total amount",
  [DiscountType.FIXED_AMOUNT]: "Discount applied as a fixed amount",
};
