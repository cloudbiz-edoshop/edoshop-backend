import { EntityType } from "./entities.constants";
import { OperationType } from "./operations.constants";

export type TicketingPageKey =
  | "create_ticket"
  | "my_requests"
  | "requests_to_approve"
  | "my_approvals"
  | "takeout_queue"
  | "return_queue"
  | "borrowed_products"
  | "management";

export const TICKETING_PAGE_ACCESS = [
  {
    key: "create_ticket" as const,
    entity: EntityType.TICKET_PAGE_CREATE,
    label: "Create Ticket",
    path: "/create-warehouse-ticket",
  },
  {
    key: "my_requests" as const,
    entity: EntityType.TICKET_PAGE_MY_REQUESTS,
    label: "My Requests",
    path: "/warehouse-tickets/my-requests",
  },
  {
    key: "requests_to_approve" as const,
    entity: EntityType.TICKET_PAGE_REQUESTS_TO_APPROVE,
    label: "Requests to Approve",
    path: "/warehouse-tickets/requests-to-approve",
  },
  {
    key: "my_approvals" as const,
    entity: EntityType.TICKET_PAGE_MY_APPROVALS,
    label: "My Approvals",
    path: "/warehouse-tickets/approvals",
  },
  {
    key: "takeout_queue" as const,
    entity: EntityType.TICKET_PAGE_TAKEOUT_QUEUE,
    label: "Takeout Queue",
    path: "/warehouse-tickets/delivery",
  },
  {
    key: "return_queue" as const,
    entity: EntityType.TICKET_PAGE_RETURN_QUEUE,
    label: "Return Queue",
    path: "/warehouse-tickets/returns",
  },
  {
    key: "borrowed_products" as const,
    entity: EntityType.TICKET_PAGE_BORROWED_PRODUCTS,
    label: "Borrowed Products",
    path: "/warehouse-tickets/borrowed",
  },
  {
    key: "management" as const,
    entity: EntityType.TICKET_PAGE_MANAGEMENT,
    label: "Ticket Management",
    path: "/warehouse-tickets",
  },
] satisfies ReadonlyArray<{
  key: TicketingPageKey;
  entity: EntityType;
  label: string;
  path: string;
}>;

export const TICKETING_PAGE_ENTITY_BY_KEY = Object.fromEntries(
  TICKETING_PAGE_ACCESS.map((entry) => [entry.key, entry.entity]),
) as Record<TicketingPageKey, EntityType>;

export const TICKETING_PAGE_ENTITIES = TICKETING_PAGE_ACCESS.map(
  (entry) => entry.entity,
);

export const TICKETING_PAGE_READ_PERMISSIONS = TICKETING_PAGE_ACCESS.map(
  (entry) => ({
    entity: entry.entity,
    operation: OperationType.READ,
  }),
);

export const ticketingPageReadAclPairs = () =>
  TICKETING_PAGE_ACCESS.map((entry) => ({
    entity: entry.entity,
    operation: OperationType.READ,
  }));
