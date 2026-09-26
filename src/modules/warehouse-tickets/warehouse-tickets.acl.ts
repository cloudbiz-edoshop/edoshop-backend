import { EntityType, OperationType } from "@/constants";
import { ticketingPageReadAclPairs } from "@/constants/ticketing-pages.constants";
import { rolesAndPermissionsMiddleware } from "@/core/middlewares";

const pageRead = ticketingPageReadAclPairs();

/** List/detail: requesters, approvers, and warehouse operators. */
export const warehouseTicketReadMiddleware = rolesAndPermissionsMiddleware(
  [
    ...pageRead,
    { entity: EntityType.TICKETING, operation: OperationType.READ },
    { entity: EntityType.TICKETING, operation: OperationType.CREATE },
    { entity: EntityType.TICKETING, operation: OperationType.UPDATE },
    { entity: EntityType.TICKET_APPROVER, operation: OperationType.READ },
    { entity: EntityType.WAREHOUSE_1, operation: OperationType.READ },
    { entity: EntityType.WAREHOUSE_1, operation: OperationType.UPDATE },
    { entity: EntityType.WAREHOUSE_2, operation: OperationType.READ },
    { entity: EntityType.WAREHOUSE_2, operation: OperationType.UPDATE },
  ],
  "ANY",
);

/** Borrow limits on create form (requesters often have create but not read). */
export const warehouseTicketFormSettingsMiddleware = rolesAndPermissionsMiddleware(
  [
    ...pageRead,
    { entity: EntityType.TICKETING, operation: OperationType.READ },
    { entity: EntityType.TICKETING, operation: OperationType.CREATE },
  ],
  "ANY",
);

export const warehouseTicketRequesterWriteMiddleware = rolesAndPermissionsMiddleware(
  [
    { entity: EntityType.TICKET_PAGE_CREATE, operation: OperationType.READ },
    { entity: EntityType.TICKET_PAGE_MY_REQUESTS, operation: OperationType.READ },
    { entity: EntityType.TICKETING, operation: OperationType.CREATE },
    { entity: EntityType.TICKETING, operation: OperationType.UPDATE },
    { entity: EntityType.TICKETING, operation: OperationType.DELETE },
  ],
  "ANY",
);

/** Approve / pause / reject — approver role or legacy ticketing update. */
export const warehouseTicketApproverActionMiddleware = rolesAndPermissionsMiddleware(
  [
    { entity: EntityType.TICKET_PAGE_REQUESTS_TO_APPROVE, operation: OperationType.READ },
    { entity: EntityType.TICKET_PAGE_MY_APPROVALS, operation: OperationType.READ },
    { entity: EntityType.TICKET_APPROVER, operation: OperationType.READ },
    { entity: EntityType.TICKETING, operation: OperationType.UPDATE },
  ],
  "ANY",
);

/** Prepare, takeout, returns — warehouse operator or ticketing update. */
export const warehouseTicketOperatorMiddleware = rolesAndPermissionsMiddleware(
  [
    { entity: EntityType.TICKET_PAGE_TAKEOUT_QUEUE, operation: OperationType.READ },
    { entity: EntityType.TICKET_PAGE_RETURN_QUEUE, operation: OperationType.READ },
    { entity: EntityType.TICKET_PAGE_BORROWED_PRODUCTS, operation: OperationType.READ },
    { entity: EntityType.TICKETING, operation: OperationType.UPDATE },
    { entity: EntityType.WAREHOUSE_1, operation: OperationType.READ },
    { entity: EntityType.WAREHOUSE_1, operation: OperationType.UPDATE },
    { entity: EntityType.WAREHOUSE_2, operation: OperationType.READ },
    { entity: EntityType.WAREHOUSE_2, operation: OperationType.UPDATE },
  ],
  "ANY",
);
