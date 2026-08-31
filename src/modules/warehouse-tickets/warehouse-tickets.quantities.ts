import { WarehouseTicketStatus } from "@/constants/warehouse-tickets.constants";

export type TicketItemQuantities = {
  quantity: number;
  preparedQuantity?: number | null;
  transferredQuantity?: number | null;
  returnedQuantity?: number | null;
  pendingReturnQuantity?: number | null;
};

export const getItemPrepared = (item: TicketItemQuantities) =>
  Number(item.preparedQuantity ?? 0);

export const getItemReceived = (item: TicketItemQuantities) =>
  Number(item.transferredQuantity ?? 0);

export const getItemReturned = (item: TicketItemQuantities) =>
  Number(item.returnedQuantity ?? 0);

export const getItemPendingReturn = (item: TicketItemQuantities) =>
  Number(item.pendingReturnQuantity ?? 0);

export const getItemOutstanding = (item: TicketItemQuantities) =>
  Math.max(0, getItemReceived(item) - getItemReturned(item));

export const getItemReturnable = (item: TicketItemQuantities) =>
  Math.max(
    0,
    getItemOutstanding(item) - getItemPendingReturn(item),
  );

export const getTicketQuantitySummary = (
  items: TicketItemQuantities[] = [],
) =>
  items.reduce(
    (summary, item) => ({
      requested: summary.requested + Number(item.quantity ?? 0),
      prepared: summary.prepared + getItemPrepared(item),
      received: summary.received + getItemReceived(item),
      returned: summary.returned + getItemReturned(item),
      pendingReturn: summary.pendingReturn + getItemPendingReturn(item),
      outstanding: summary.outstanding + getItemOutstanding(item),
    }),
    {
      requested: 0,
      prepared: 0,
      received: 0,
      returned: 0,
      pendingReturn: 0,
      outstanding: 0,
    },
  );

const BORROW_ACTIVE_STATUSES = new Set<string>([
  WarehouseTicketStatus.RECEIVED_BORROWED,
  WarehouseTicketStatus.PARTIALLY_RETURNED,
  WarehouseTicketStatus.RETURN_PENDING,
  WarehouseTicketStatus.COMPLETED,
]);

export const resolveBorrowTicketStatus = (
  items: TicketItemQuantities[],
  fallbackStatus: string,
): WarehouseTicketStatus => {
  const summary = getTicketQuantitySummary(items);

  if (summary.received <= 0) {
    return fallbackStatus as WarehouseTicketStatus;
  }

  if (summary.pendingReturn > 0) {
    return WarehouseTicketStatus.RETURN_PENDING;
  }

  if (summary.outstanding <= 0) {
    return WarehouseTicketStatus.CLOSED;
  }

  if (summary.returned > 0) {
    return WarehouseTicketStatus.PARTIALLY_RETURNED;
  }

  return WarehouseTicketStatus.RECEIVED_BORROWED;
};

export const isBorrowActiveStatus = (status: string) =>
  BORROW_ACTIVE_STATUSES.has(status);

export const mapLegacyStatus = (status: string) =>
  status === WarehouseTicketStatus.COMPLETED
    ? WarehouseTicketStatus.RECEIVED_BORROWED
    : status;
