export const SUPPLIER_PRODUCT_TYPE_VALUES = [
  "clothing",
  "electronics",
  "kitchen_utensils",
  "home_decor",
  "shoes",
  "accessories",
] as const;

export type SupplierProductType = (typeof SUPPLIER_PRODUCT_TYPE_VALUES)[number];

export const SUPPLIER_PRODUCT_TYPE_LABELS: Record<SupplierProductType, string> = {
  clothing: "Clothing",
  electronics: "Electronics",
  kitchen_utensils: "Kitchen utensils",
  home_decor: "Home decor",
  shoes: "Shoes",
  accessories: "Accessories",
};
