export enum ProductCategoryPairs {
  BASIC_TEE_MEN = "Basic Tee + Men",
  SPORT_SHOES_SHOES = "Sport Shoes + Shoes",
  DENIM_JACKET_MEN = "Denim Jacket + Men",
  SUMMER_DRESS_WOMEN = "Summer Dress + Women",
  LEATHER_BAG_ACCESSORIES = "Leather Bag + Accessories",
  SMART_WATCH_ELECTRONICS = "Smart Watch + Electronics",
}

export const PRODUCT_CATEGORIES = [
  {
    name: ProductCategoryPairs.BASIC_TEE_MEN,
    productId: 1, // Basic Tee
    categoryId: 1, // Men
    createdBy: 1,
    updatedBy: 1,
  },
  {
    name: ProductCategoryPairs.SPORT_SHOES_SHOES,
    productId: 2, // Sport Shoes
    categoryId: 5, // Shoes
    createdBy: 1,
    updatedBy: 1,
  },
  {
    name: ProductCategoryPairs.DENIM_JACKET_MEN,
    productId: 3, // Denim Jacket
    categoryId: 1, // Men
    createdBy: 1,
    updatedBy: 1,
  },
  {
    name: ProductCategoryPairs.SUMMER_DRESS_WOMEN,
    productId: 4, // Summer Dress
    categoryId: 2, // Women
    createdBy: 1,
    updatedBy: 1,
  },
  {
    name: ProductCategoryPairs.LEATHER_BAG_ACCESSORIES,
    productId: 5, // Leather Bag
    categoryId: 4, // Accessories
    createdBy: 1,
    updatedBy: 1,
  },
  {
    name: ProductCategoryPairs.SMART_WATCH_ELECTRONICS,
    productId: 6, // Smart Watch
    categoryId: 6, // Electronics
    createdBy: 1,
    updatedBy: 1,
  },
];
