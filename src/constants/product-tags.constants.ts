// constants/productTags.constants.ts

export enum ProductTagPairs {
  BASIC_TEE_COTTON = "Basic Tee + Cotton",
  SMART_WATCH_TECH = "Smart Watch + Tech",
  SPORT_SHOES_FITNESS = "Sport Shoes + Fitness",
}

export const PRODUCT_TAGS = [
  {
    name: ProductTagPairs.BASIC_TEE_COTTON,
    productId: 1,
    tagId: 1, // Cotton
    createdBy: 1,
    updatedBy: 1,
  },
  {
    name: ProductTagPairs.SMART_WATCH_TECH,
    productId: 6,
    tagId: 2, // Tech
    createdBy: 1,
    updatedBy: 1,
  },
  {
    name: ProductTagPairs.SPORT_SHOES_FITNESS,
    productId: 2,
    tagId: 3, // Fitness
    createdBy: 1,
    updatedBy: 1,
  },
];
