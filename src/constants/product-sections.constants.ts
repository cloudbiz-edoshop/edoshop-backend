import { z } from "@hono/zod-openapi";

export const ProductSection = {
  APPAREL_CLOTHING: "apparel_clothing",
  ELECTRONIC: "electronic",
  KITCHEN_UTENSILS: "kitchen_utensils",
  HOME_ACCESSORIES: "home_accessories",
  OFFICE_ACCESSORIES: "office_accessories",
  SCHOOL_ACCESSORIES: "school_accessories",
  TECHNICIAN_ACCESSORIES: "technician_accessories",
} as const;

export type ProductSectionValue =
  (typeof ProductSection)[keyof typeof ProductSection];

export const PRODUCT_SECTION_OPTIONS: {
  value: ProductSectionValue;
  label: string;
}[] = [
  {
    value: ProductSection.APPAREL_CLOTHING,
    label: "Apparel / Clothing product",
  },
  { value: ProductSection.ELECTRONIC, label: "Electronic product" },
  {
    value: ProductSection.KITCHEN_UTENSILS,
    label: "Kitchen Utensils product",
  },
  {
    value: ProductSection.HOME_ACCESSORIES,
    label: "Home Accessories product",
  },
  {
    value: ProductSection.OFFICE_ACCESSORIES,
    label: "Office Accessories product",
  },
  {
    value: ProductSection.SCHOOL_ACCESSORIES,
    label: "School Accessories product",
  },
  {
    value: ProductSection.TECHNICIAN_ACCESSORIES,
    label: "Technician Accessories product",
  },
];

export const PRODUCT_SECTION_LABELS = Object.fromEntries(
  PRODUCT_SECTION_OPTIONS.map((option) => [option.value, option.label]),
) as Record<ProductSectionValue, string>;

export const productSectionValues = PRODUCT_SECTION_OPTIONS.map(
  (option) => option.value,
);

export const productSectionSchema = z.enum([
  ProductSection.APPAREL_CLOTHING,
  ProductSection.ELECTRONIC,
  ProductSection.KITCHEN_UTENSILS,
  ProductSection.HOME_ACCESSORIES,
  ProductSection.OFFICE_ACCESSORIES,
  ProductSection.SCHOOL_ACCESSORIES,
  ProductSection.TECHNICIAN_ACCESSORIES,
]);

export const isProductSectionValue = (
  value?: string | null,
): value is ProductSectionValue =>
  Boolean(value && productSectionValues.includes(value as ProductSectionValue));
