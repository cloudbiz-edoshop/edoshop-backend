export enum WarehouseTicketStatus {
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  PAUSED = "paused",
  REJECTED = "rejected",
  READY_FOR_PICKUP = "ready_for_pickup",
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
  CONFIRMED = "confirmed",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  DELETED = "deleted",
  ITEM_TRANSFERRED = "item_transferred",
  ITEM_RETURNED = "item_returned",
  RETURN_REMINDER = "return_reminder",
}

export const WAREHOUSE_TICKET_STATUS_LABELS: Record<
  WarehouseTicketStatus,
  string
> = {
  [WarehouseTicketStatus.PENDING_APPROVAL]: "Pending Approval",
  [WarehouseTicketStatus.APPROVED]: "Approved",
  [WarehouseTicketStatus.PAUSED]: "Paused",
  [WarehouseTicketStatus.REJECTED]: "Rejected",
  [WarehouseTicketStatus.READY_FOR_PICKUP]: "Ready for Pickup",
  [WarehouseTicketStatus.COMPLETED]: "Completed",
  [WarehouseTicketStatus.CANCELLED]: "Cancelled",
};

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
