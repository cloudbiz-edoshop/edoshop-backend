/**
 * Attribute types available in the application
 * Using enum for better type safety and autocompletion
 */
export enum AttributeType {
  MANUFACTURE_BY = "manufacture_by",
  BRANDS = "brands",
  DESIGN_PATTERNS = "design_patterns",
  MATERIALS = "materials",
  OTHER = "other",
}

export const AttributeTypeIds = {
  MANUFACTURE_BY: 1,
  BRANDS: 2,
  DESIGN_PATTERNS: 3,
  MATERIALS: 4,
  OTHER: 5,
} as const;

/**
 * Provides descriptions for attribute types
 */
export const ATTRIBUTE_TYPE_DESCRIPTIONS: Record<AttributeType, string> = {
  [AttributeType.MANUFACTURE_BY]: "Manufacture By",
  [AttributeType.BRANDS]: "Brands",
  [AttributeType.DESIGN_PATTERNS]: "Design Patterns",
  [AttributeType.MATERIALS]: "Materials",
  [AttributeType.OTHER]: "Other",
};
