import type { Database } from "@/db";

import {
  DISCOUNT_TYPE_DESCRIPTIONS,
  DiscountType,
} from "@/constants/discount-types.constants";

import { discountTypes as discountTypesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  // Process discount types in chunks
  for (let i = 0; i < Object.values(DiscountType).length; i += CHUNK_SIZE) {
    const chunk = Object.values(DiscountType)
      .slice(i, i + CHUNK_SIZE)
      .map((discountType) => ({
        name: discountType,
        description: DISCOUNT_TYPE_DESCRIPTIONS[discountType],
        createdBy: 1,
        updatedBy: 1,
      }));
    await db.insert(discountTypesTable).values(chunk);
  }
}
