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

/**
 * Sample addresses data for seeding
 */
export const ADDRESSES_DATA = [
  {
    userId: 1,
    addressTypeId: AddressTypeIds.BILLING,
    streetAddress: "123 Billing St",
    countryId: 1,
    cityId: 5,
    stateProvince: "NY",
    postalCode: "10001",
    landmark: "Near Billing Center",
    isDefault: true,
    createdBy: 1,
    updatedBy: 1,
  },
  {
    userId: 2,
    addressTypeId: AddressTypeIds.SHIPPING,
    streetAddress: "456 Shipping Ln",
    countryId: 1,
    cityId: 2,
    stateProvince: "CA",
    postalCode: "90001",
    landmark: "Near Shipping Dock",
    isDefault: false,
    createdBy: 2,
    updatedBy: 2,
  },
  {
    userId: 1,
    addressTypeId: AddressTypeIds.OTHER,
    streetAddress: "789 Other Rd",
    countryId: 1,
    cityId: 3,
    stateProvince: "ON",
    postalCode: "M5V 2T6",
    landmark: "Near Other Place",
    isDefault: false,
    createdBy: 1,
    updatedBy: 1,
  },
  {
    userId: 4,
    addressTypeId: AddressTypeIds.BILLING,
    streetAddress: "Street b44",
    countryId: 1,
    cityId: 48,
    stateProvince: "KH",
    postalCode: "44000",
    landmark: "Near Billing Center",
    isDefault: true,
    createdBy: 4,
    updatedBy: 4,
  },
  {
    userId: 4,
    addressTypeId: AddressTypeIds.SHIPPING,
    streetAddress: "Street 55",
    countryId: 1,
    cityId: 48,
    stateProvince: "KH",
    postalCode: "55000",
    landmark: "Near Shipping Dock",
    isDefault: false,
    createdBy: 4,
    updatedBy: 4,
  },
];
