import { eq } from "drizzle-orm";

import { AppError } from "@/core/errors/app-error";
import db from "@/db";
import { items } from "@/db/models/items";

/** Legacy warehouse spreadsheet references — not valid storefront product IDs. */
const LEGACY_EXCEL_DIRECT_ORDER_CODE = /^DO-[A-Z]{2}-B\d+-[A-Z0-9]+$/i;

/**
 * Direct Order products must link to an existing EWMS Item code
 * (bundle → series → item hierarchy), not ad-hoc or spreadsheet IDs.
 */
export async function assertValidDirectOrderProductCode(code: string) {
  const trimmed = code.trim();
  if (!trimmed) {
    throw new AppError("Direct Order Product ID is required");
  }

  if (LEGACY_EXCEL_DIRECT_ORDER_CODE.test(trimmed)) {
    throw new AppError(
      "Product ID must be an EWMS Item code (e.g. PK_A01_B1_S1_I1), not a legacy spreadsheet reference.",
    );
  }

  const item = await db.query.items.findFirst({
    where: eq(items.itemCode, trimmed),
  });

  if (!item) {
    throw new AppError(
      `No warehouse item exists with code "${trimmed}". Create the Item entry in EWMS first, then select that ID here.`,
    );
  }
}
