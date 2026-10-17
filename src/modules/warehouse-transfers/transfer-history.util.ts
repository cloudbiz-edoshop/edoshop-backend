import type { TX } from "@/lib/types";
import { eq } from "drizzle-orm";

import { warehouseTransfers, warehouseTransfersHistory } from "@/db/models";

export async function recordWarehouseTransferHistory(
  tx: TX,
  transferId: number,
  userId: number,
  notes?: string | null,
) {
  const [transfer] = await tx
    .select()
    .from(warehouseTransfers)
    .where(eq(warehouseTransfers.id, transferId))
    .limit(1);

  if (!transfer) {
    return;
  }

  const timestamp = new Date().toISOString();

  await tx.insert(warehouseTransfersHistory).values({
    transferCode: transfer.transferCode,
    transferId: transfer.id,
    entryId: transfer.entryId,
    sourceWarehouseId: transfer.sourceWarehouseId,
    destinationWarehouseId: transfer.destinationWarehouseId,
    statusId: transfer.statusId,
    notes: notes ?? transfer.notes,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: userId,
    initiatedBy: transfer.initiatedBy,
    updatedBy: userId,
    approvedBy: transfer.approvedBy,
  });
}
