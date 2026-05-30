/**
 * Variant types available in the application
 * Using enum for better type safety and autocompletion
 */
export enum VariantType {
  DEFAULT = "default",
  LIMITED_EDITION = "limited_edition",
  SEASONAL = "seasonal",
  PRE_ORDER = "pre_order",
}

/**
 * Numeric IDs associated with each variant type
 */
export const VariantTypeIds = {
  DEFAULT: 1,
  LIMITED_EDITION: 2,
  SEASONAL: 3,
  PRE_ORDER: 4,
} as const;

/**
 * Provides human-readable descriptions for variant types
 */
export const VARIANT_TYPE_DESCRIPTIONS: Record<VariantType, string> = {
  [VariantType.DEFAULT]: "Default",
  [VariantType.LIMITED_EDITION]: "Limited Edition",
  [VariantType.SEASONAL]: "Seasonal",
  [VariantType.PRE_ORDER]: "Pre-Order",
};

/**
 * Default variant records for seeding
 */
export const VARIANTS = [
  {
    productId: 1,
    itemId: 1,
    colorId: 1,
    sizeId: 1,
    materialTypeId: 1,
    designPatternId: 1,
    quantity: 50,
    additionalInfo: {
      type: VariantType.DEFAULT,
      note: "In-stock default variant",
    },
    createdBy: 1,
    updatedBy: 1,
  },
  {
    productId: 1,
    itemId: 1,
    colorId: 2,
    sizeId: 2,
    materialTypeId: 2,
    designPatternId: 2,
    quantity: 20,
    additionalInfo: {
      type: VariantType.LIMITED_EDITION,
      note: "Special drop, limited supply",
    },
    createdBy: 1,
    updatedBy: 1,
  },
  {
    productId: 2,
    itemId: 2,
    colorId: 3,
    sizeId: 1,
    materialTypeId: 3,
    designPatternId: 3,
    quantity: 75,
    additionalInfo: {
      type: VariantType.SEASONAL,
      note: "Available this season only",
    },
    createdBy: 2,
    updatedBy: 2,
  },
  {
    productId: 3,
    itemId: 1,
    colorId: 4,
    sizeId: 3,
    materialTypeId: 4,
    designPatternId: 4,
    quantity: 35,
    additionalInfo: {
      type: VariantType.PRE_ORDER,
      note: "Ships in 2 weeks",
    },
    createdBy: 2,
    updatedBy: 2,
  },
  {
    productId: 4,
    itemId: 3,
    colorId: 5,
    sizeId: 1,
    materialTypeId: 5,
    designPatternId: 5,
    quantity: 60,
    additionalInfo: {
      type: VariantType.DEFAULT,
      ecoFriendly: true,
    },
    createdBy: 3,
    updatedBy: 3,
  },
  {
    productId: 5,
    itemId: 3,
    colorId: 6,
    sizeId: 2,
    materialTypeId: 6,
    designPatternId: 6,
    quantity: 15,
    additionalInfo: {
      type: VariantType.LIMITED_EDITION,
      signedByDesigner: true,
    },
    createdBy: 3,
    updatedBy: 3,
  },
  {
    productId: 5,
    itemId: 4,
    colorId: 7,
    sizeId: 3,
    materialTypeId: 5,
    designPatternId: 4,
    quantity: 40,
    additionalInfo: {
      type: VariantType.SEASONAL,
      exclusiveColors: ["Sunset Orange", "Ocean Blue"],
    },
    createdBy: 1,
    updatedBy: 1,
  },
];
