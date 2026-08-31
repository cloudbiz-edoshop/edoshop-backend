import type { UserNotificationDelivery } from "@/db/models/user-notification-deliveries";
import type { UserAccessProfile } from "@/modules/permissions/permissions.service";
import { PermissionsService } from "@/modules/permissions/permissions.service";
import { WAREHOUSE_TICKET_NOTIFICATION_REFERENCES } from "@/constants/warehouse-tickets.constants";

const permissionsService = new PermissionsService();

const APPROVER_NOTIFICATION_TITLES = new Set([
  "Warehouse ticket awaiting approval",
  "Return initiated",
  "Warehouse ticket paused by warehouse team",
  "Warehouse ticket rejected by warehouse team",
]);

const RECEIVER_NOTIFICATION_TITLES = new Set([
  "Approved warehouse ticket ready for delivery",
  "Return pending confirmation",
  "Borrowed products return recorded",
]);

const REQUESTER_NOTIFICATION_TITLES = new Set([
  "Warehouse ticket approved",
  "Warehouse ticket paused",
  "Warehouse ticket rejected",
  "Items ready for pickup",
  "Borrow confirmed",
  "Return submitted",
  "Return confirmed",
  "Borrowed products returned",
  "Reminder: return borrowed products",
]);

function hasApproverAccess(profile: UserAccessProfile) {
  if (profile.isSuperAdmin || profile.isAdminRole) {
    return true;
  }

  return permissionsService.hasPermission(
    profile,
    "ticket_approver",
    "read",
  );
}

function hasReceiverAccess(profile: UserAccessProfile, warehouseId?: number | null) {
  if (profile.isSuperAdmin || profile.isAdminRole) {
    return true;
  }

  if (!permissionsService.hasPermission(profile, "ticketing", "update")) {
    return false;
  }

  if (!warehouseId) {
    return (
      permissionsService.hasPermission(profile, "warehouse_1", "update")
      || permissionsService.hasPermission(profile, "warehouse_1", "read")
      || permissionsService.hasPermission(profile, "warehouse_2", "update")
      || permissionsService.hasPermission(profile, "warehouse_2", "read")
    );
  }

  const warehouseEntity = warehouseId === 1 ? "warehouse_1" : "warehouse_2";
  return (
    permissionsService.hasPermission(profile, warehouseEntity, "update")
    || permissionsService.hasPermission(profile, warehouseEntity, "read")
  );
}

export function isWarehouseTicketNotificationRelevant(params: {
  notification: Pick<
    UserNotificationDelivery,
    "title" | "referenceType" | "referenceId"
  >;
  userId: number;
  accessProfile: UserAccessProfile;
  ticketRequesterId?: number | null;
  ticketWarehouseId?: number | null;
}) {
  const { notification, userId, accessProfile, ticketRequesterId, ticketWarehouseId } =
    params;
  const isRequester = ticketRequesterId != null && ticketRequesterId === userId;

  if (APPROVER_NOTIFICATION_TITLES.has(notification.title)) {
    return hasApproverAccess(accessProfile) && !isRequester;
  }

  if (RECEIVER_NOTIFICATION_TITLES.has(notification.title)) {
    return hasReceiverAccess(accessProfile, ticketWarehouseId) && !isRequester;
  }

  if (REQUESTER_NOTIFICATION_TITLES.has(notification.title)) {
    return isRequester;
  }

  return false;
}

export async function filterStaffNotificationsForUser(params: {
  userId: number;
  notifications: UserNotificationDelivery[];
  accessProfile: UserAccessProfile;
  ticketContextById: Map<number, { requesterId: number; warehouseId: number }>;
}) {
  const { userId, notifications, accessProfile, ticketContextById } = params;

  return notifications.filter((notification) => {
    if (
      notification.referenceType !==
        WAREHOUSE_TICKET_NOTIFICATION_REFERENCES.APPROVAL &&
      notification.referenceType !== WAREHOUSE_TICKET_NOTIFICATION_REFERENCES.TICKET
    ) {
      return true;
    }

    if (!notification.referenceId) {
      return isWarehouseTicketNotificationRelevant({
        notification,
        userId,
        accessProfile,
      });
    }

    const ticketContext = ticketContextById.get(notification.referenceId);

    return isWarehouseTicketNotificationRelevant({
      notification,
      userId,
      accessProfile,
      ticketRequesterId: ticketContext?.requesterId ?? null,
      ticketWarehouseId: ticketContext?.warehouseId ?? null,
    });
  });
}
