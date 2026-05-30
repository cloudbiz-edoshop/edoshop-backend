/**
 * Address types available in the application
 * Using enum for better type safety and autocompletion
 */
export enum AddressType {
  BILLING = "billing",
  SHIPPING = "shipping",
  SUPPLIER = "supplier",
  CUSTOMER = "customer",
  RETAILER = "retailer",
  OTHER = "other",
}

export const AddressTypeIds = {
  BILLING: 1,
  SHIPPING: 2,
  SUPPLIER: 3,
  CUSTOMER: 4,
  RETAILER: 5,
  OTHER: 6,
} as const;

/**
 * Provides descriptions for address types
 */
export const ADDRESS_TYPE_DESCRIPTIONS: Record<AddressType, string> = {
  [AddressType.BILLING]: "Billing",
  [AddressType.SHIPPING]: "Shipping",
  [AddressType.SUPPLIER]: "Supplier",
  [AddressType.CUSTOMER]: "Customer",
  [AddressType.RETAILER]: "Retailer",
  [AddressType.OTHER]: "Other",
};
