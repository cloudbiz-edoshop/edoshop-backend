export enum ProductPricingMode {
  SINGLE = "single",
  BULK = "bulk",
}

export const PRODUCT_PRICING_MODES = [
  ProductPricingMode.SINGLE,
  ProductPricingMode.BULK,
] as const;
