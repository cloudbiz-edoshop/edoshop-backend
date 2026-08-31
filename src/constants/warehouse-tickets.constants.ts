export enum WarehouseTicketStatus {
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  BEING_PREPARED = "being_prepared",
  PAUSED = "paused",
  REJECTED = "rejected",
  READY_FOR_PICKUP = "ready_for_pickup",
  RECEIVED_BORROWED = "received_borrowed",
  RETURN_PENDING = "return_pending",
  PARTIALLY_RETURNED = "partially_returned",
  CLOSED = "closed",
  /** @deprecated Use RECEIVED_BORROWED — kept for legacy rows */
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum WarehouseTicketEventAction {
  CREATED = "created",
  UPDATED = "updated",
  APPROVED = "approved",
  PAUSED = "paused",
  REJECTED = "rejected",
  RESUMED = "resumed",
  PREPARED = "prepared",
  CONFIRMED = "confirmed",
  TAKEOUT_CONFIRMED = "takeout_confirmed",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  DELETED = "deleted",
  ITEM_TRANSFERRED = "item_transferred",
  ITEM_PREPARED = "item_prepared",
  RETURN_INITIATED = "return_initiated",
  RETURN_CONFIRMED = "return_confirmed",
  ITEM_RETURNED = "item_returned",
  RETURN_REMINDER = "return_reminder",
  CLOSED = "closed",
}

export const WAREHOUSE_TICKET_STATUS_LABELS: Record<
  WarehouseTicketStatus,
  string
> = {
  [WarehouseTicketStatus.PENDING_APPROVAL]: "Pending Approval",
  [WarehouseTicketStatus.APPROVED]: "Approved",
  [WarehouseTicketStatus.BEING_PREPARED]: "Being Prepared",
  [WarehouseTicketStatus.PAUSED]: "Paused",
  [WarehouseTicketStatus.REJECTED]: "Rejected",
  [WarehouseTicketStatus.READY_FOR_PICKUP]: "Ready for Pickup",
  [WarehouseTicketStatus.RECEIVED_BORROWED]: "Received / Borrowed",
  [WarehouseTicketStatus.RETURN_PENDING]: "Return Pending",
  [WarehouseTicketStatus.PARTIALLY_RETURNED]: "Partially Returned",
  [WarehouseTicketStatus.CLOSED]: "Closed",
  [WarehouseTicketStatus.COMPLETED]: "Received / Borrowed",
  [WarehouseTicketStatus.CANCELLED]: "Cancelled",
};

export const WAREHOUSE_TICKET_OPEN_STATUSES = [
  WarehouseTicketStatus.PENDING_APPROVAL,
  WarehouseTicketStatus.APPROVED,
  WarehouseTicketStatus.BEING_PREPARED,
  WarehouseTicketStatus.PAUSED,
  WarehouseTicketStatus.READY_FOR_PICKUP,
  WarehouseTicketStatus.RECEIVED_BORROWED,
  WarehouseTicketStatus.RETURN_PENDING,
  WarehouseTicketStatus.PARTIALLY_RETURNED,
] as const;

export const WAREHOUSE_TICKET_DELIVERY_STATUSES = [
  WarehouseTicketStatus.APPROVED,
  WarehouseTicketStatus.BEING_PREPARED,
  WarehouseTicketStatus.READY_FOR_PICKUP,
] as const;

export const WAREHOUSE_TICKET_BORROWED_STATUSES = [
  WarehouseTicketStatus.RECEIVED_BORROWED,
  WarehouseTicketStatus.PARTIALLY_RETURNED,
  WarehouseTicketStatus.COMPLETED,
] as const;

export const WAREHOUSE_TICKET_LIMITS = {
  MAX_LINE_ITEMS: 20,
  MAX_TOTAL_QUANTITY: 50,
  MAX_OPEN_TICKETS_PER_USER: 5,
} as const;

export type WarehouseTicketLimits = {
  maxLineItems: number;
  maxTotalQuantity: number;
  maxOpenTicketsPerUser: number;
};

export const WAREHOUSE_TICKET_NOTIFICATION_REFERENCES = {
  APPROVAL: "warehouse_ticket_approval",
  TICKET: "warehouse_ticket",
} as const;

export const WAREHOUSE_TICKET_PERMISSIONS = {
  APPROVER_ENTITY: "ticket_approver",
  APPROVER_OPERATION: "read",
  BORROW_LIMITS_ENTITY: "ticket_borrow_limits",
  BORROW_LIMITS_OPERATION: "update",
} as const;

export const WAREHOUSE_TICKET_W1_TECH_ROLES = [
  "w1_tech",
  "warehouse_supervisor",
  "admin",
  "super_admin",
  "manager",
] as const;

export const WAREHOUSE_TICKET_W2_TECH_ROLES = [
  "w2_tech",
  "warehouse_supervisor",
  "admin",
  "super_admin",
  "manager",
] as const;
