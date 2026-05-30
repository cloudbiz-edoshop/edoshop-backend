/**
 * Product store types available in the application
 * Using enum for better type safety and autocompletion
 */
export enum ProductStoreType {
  DIRECT_ORDER = "DirectOrder",
  DROPSHIPPING = "Dropshipping",
}

export const ProductStoreTypeIds = {
  DIRECT_ORDER: 1,
  DROPSHIPPING: 2,
} as const;

/**
 * Provides descriptions for product store types
 */
export const PRODUCT_STORE_TYPE_DESCRIPTIONS: Record<ProductStoreType, string> = {
  [ProductStoreType.DIRECT_ORDER]: "Direct Order",
  [ProductStoreType.DROPSHIPPING]: "Dropshipping",
};

export const ProductStoreTypeIdToEnum: Record<number, ProductStoreType> = {
  1: ProductStoreType.DIRECT_ORDER,
  2: ProductStoreType.DROPSHIPPING,
};
