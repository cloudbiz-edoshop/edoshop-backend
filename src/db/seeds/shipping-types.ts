import type { Database } from "@/db";

import {
  SHIPPING_TYPES,
  SHIPPING_TYPES_DESCRIPTIONS,
} from "@/constants/shipping-types.constants";

import { shippingTypes as shippingTypesTable } from "../models/shipping-types";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < Object.values(SHIPPING_TYPES).length; i += CHUNK_SIZE) {
    const chunk = Object.values(SHIPPING_TYPES)
      .slice(i, i + CHUNK_SIZE)
      .map((type) => ({
        name: type,
        description: SHIPPING_TYPES_DESCRIPTIONS[type],
        createdBy: 1,
        updatedBy: 1,
      }));
    await db.insert(shippingTypesTable).values(chunk);
  }
}
