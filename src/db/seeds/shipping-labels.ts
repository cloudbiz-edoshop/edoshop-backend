import type { Database } from "@/db";

import { SHIPPING_LABELS } from "@/constants";
import { eq } from "drizzle-orm";

import { packages, shippingLabels as shippingLabelsTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < SHIPPING_LABELS.length; i += CHUNK_SIZE) {
    const chunk = SHIPPING_LABELS.slice(i, i + CHUNK_SIZE).map((item) => ({
      packageId: item.packageId,
      shippingTypeId: item.shippingTypeId,
      shippingPriorityCodeId: item.shippingPriorityCodeId,
      netWeight: item.netWeight,
      purchasedBy: item.purchasedBy,
      additionalNotes: item.additionalNotes,
      customerFullName: `${item.customerFirstName} ${item.customerLastName}`.trim(),
      address: item.address,
      country: item.country,
      city: item.city,
      createdBy: item.purchasedBy,
      updatedBy: item.purchasedBy,
    }));
    await db.insert(shippingLabelsTable).values(chunk);

    for (const item of chunk) {
      await db
        .update(packages)
        .set({ hasShippingLabel: 1 })
        .where(eq(packages.id, item.packageId));
    }
  }
}
