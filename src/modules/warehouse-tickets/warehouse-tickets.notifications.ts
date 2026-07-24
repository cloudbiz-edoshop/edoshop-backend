import { NotificationTypeIds } from "@/constants/notification-types.constants";
import { NotificationAudience } from "@/constants/notification-audience.constants";
import {
  WAREHOUSE_TICKET_NOTIFICATION_REFERENCES,
  WAREHOUSE_TICKET_PERMISSIONS,
  WAREHOUSE_TICKET_W1_TECH_ROLES,
  WAREHOUSE_TICKET_W2_TECH_ROLES,
} from "@/constants/warehouse-tickets.constants";
import { NotificationDeliveryService } from "@/modules/notifications/notification-delivery.service";

import { WarehouseTicketsRepository } from "./warehouse-tickets.repository";

const notificationDeliveryService = new NotificationDeliveryService();
const warehouseTicketsRepository = new WarehouseTicketsRepository();

const formatUserName = (user?: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) => {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return fullName || user?.email || "Team member";
};

export function formatNotificationTimestamp(date = new Date()) {
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function withNotificationTimestamp(message: string, date = new Date()) {
  return `${message} — ${formatNotificationTimestamp(date)}`;
}

export async function notifyWarehouseTicketUsers(params: {
  userIds: number[];
  title: string;
  message: string;
  notificationTypeId?: number;
  timestamp?: Date;
  actionUrl?: string | null;
  referenceType?: string | null;
  referenceId?: number | null;
}) {
  const uniqueUserIds = [...new Set(params.userIds.filter(Boolean))];
  const message = withNotificationTimestamp(params.message, params.timestamp);

  await Promise.all(
    uniqueUserIds.map((userId) =>
      notificationDeliveryService.deliverToUser({
        userId,
        title: params.title,
        message,
        notificationTypeId:
          params.notificationTypeId ?? NotificationTypeIds.WARNING,
        channels: ["webapp"],
        actionUrl: params.actionUrl ?? null,
        referenceType: params.referenceType ?? null,
        referenceId: params.referenceId ?? null,
        audience: NotificationAudience.STAFF,
      }),
    ),
  );
}

export async function deactivateTicketApprovalNotifications(ticketId: number) {
  await notificationDeliveryService.deactivateNotificationsByReference({
    referenceType: WAREHOUSE_TICKET_NOTIFICATION_REFERENCES.APPROVAL,
    referenceId: ticketId,
  });
}

export async function notifyApproversForNewTicket(params: {
  ticketId: number;
  ticketCode: string;
  requesterId: number;
  requesterName: string;
  warehouseLabel: string;
}) {
  const approverIds = (
    await warehouseTicketsRepository.listUserIdsByPermission(
      WAREHOUSE_TICKET_PERMISSIONS.APPROVER_ENTITY,
      WAREHOUSE_TICKET_PERMISSIONS.APPROVER_OPERATION,
    )
  ).filter((userId) => userId !== params.requesterId);

  await notifyWarehouseTicketUsers({
    userIds: approverIds,
    title: "Warehouse ticket awaiting approval",
    message: `${params.requesterName} submitted ticket ${params.ticketCode} for ${params.warehouseLabel}. Please review and approve, pause, or reject.`,
    notificationTypeId: NotificationTypeIds.REQUEST_APPROVED,
    actionUrl: `/warehouse-tickets/${params.ticketId}`,
    referenceType: WAREHOUSE_TICKET_NOTIFICATION_REFERENCES.APPROVAL,
    referenceId: params.ticketId,
  });
}

export async function notifyRequester(params: {
  requesterId: number;
  title: string;
  message: string;
  ticketId?: number;
}) {
  await notifyWarehouseTicketUsers({
    userIds: [params.requesterId],
    title: params.title,
    message: params.message,
    actionUrl: params.ticketId ? `/warehouse-tickets/${params.ticketId}` : null,
    referenceType: params.ticketId
      ? WAREHOUSE_TICKET_NOTIFICATION_REFERENCES.TICKET
      : null,
    referenceId: params.ticketId ?? null,
  });
}

export async function notifyWarehouseTechsForApprovedTicket(params: {
  ticketId: number;
  warehouseId: number;
  ticketCode: string;
  requesterName: string;
}) {
  const roleNames =
    params.warehouseId === 1
      ? [...WAREHOUSE_TICKET_W1_TECH_ROLES]
      : [...WAREHOUSE_TICKET_W2_TECH_ROLES];

  const techIds =
    await warehouseTicketsRepository.listUserIdsByRoleNames(roleNames);

  await notifyWarehouseTicketUsers({
    userIds: techIds,
    title: "Approved warehouse ticket ready for delivery",
    message: `Ticket ${params.ticketCode} from ${params.requesterName} has been approved. Transfer items out of EWMS and confirm when ready for pickup.`,
    notificationTypeId: NotificationTypeIds.REQUEST_APPROVED,
    actionUrl: `/warehouse/${params.warehouseId}/send-requested-products?ticketId=${params.ticketId}`,
    referenceType: WAREHOUSE_TICKET_NOTIFICATION_REFERENCES.TICKET,
    referenceId: params.ticketId,
  });
}

export async function notifyApproversAndRequester(params: {
  requesterId: number;
  ticketId: number;
  ticketCode: string;
  title: string;
  message: string;
}) {
  const approverIds = (
    await warehouseTicketsRepository.listUserIdsByPermission(
      WAREHOUSE_TICKET_PERMISSIONS.APPROVER_ENTITY,
      WAREHOUSE_TICKET_PERMISSIONS.APPROVER_OPERATION,
    )
  ).filter((userId) => userId !== params.requesterId);

  await notifyWarehouseTicketUsers({
    userIds: [...approverIds, params.requesterId],
    title: params.title,
    message: params.message,
    actionUrl: `/warehouse-tickets/${params.ticketId}`,
    referenceType: WAREHOUSE_TICKET_NOTIFICATION_REFERENCES.TICKET,
    referenceId: params.ticketId,
  });
}

export async function notifyReturnReminder(params: {
  requesterId: number;
  ticketId: number;
  ticketCode: string;
  outstandingQuantity: number;
}) {
  await notifyWarehouseTicketUsers({
    userIds: [params.requesterId],
    title: "Reminder: return borrowed products",
    message: `Ticket ${params.ticketCode} still has ${params.outstandingQuantity} borrowed item(s) to return to EWMS.`,
    notificationTypeId: NotificationTypeIds.WARNING,
    actionUrl: `/warehouse-tickets/${params.ticketId}`,
    referenceType: WAREHOUSE_TICKET_NOTIFICATION_REFERENCES.TICKET,
    referenceId: params.ticketId,
  });
}

export { formatUserName };
