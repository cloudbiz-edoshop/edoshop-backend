import type { Database } from "@/db";

import { SHIPPING_PRIORITY_CODES, SHIPPING_PRIORITY_DESCRIPTIONS } from "@/constants/shipping-priority-codes.constants";

import { shippingPriorityCodes as shippingPriorityCodesTable } from "../models/shipping-priority-codes";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  // Process entities in chunks
  for (let i = 0; i < Object.values(SHIPPING_PRIORITY_CODES).length; i += CHUNK_SIZE) {
    const chunk = Object.values(SHIPPING_PRIORITY_CODES)
      .slice(i, i + CHUNK_SIZE)
      .map((code) => ({
        code,
        description: SHIPPING_PRIORITY_DESCRIPTIONS[code],
        createdBy: 1,
        updatedBy: 1,
      }));
    await db.insert(shippingPriorityCodesTable).values(chunk);
  }
}
