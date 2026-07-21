import { EntityType, OperationType } from "@/constants";

export const PROTECTED_ROLE_NAMES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
} as const;

export const SETTINGS_ENTITIES: EntityType[] = [
  EntityType.SETTINGS,
  EntityType.PAYMENT_METHODS,
  EntityType.SUPPLIERS,
  EntityType.ENTITIES,
  EntityType.OPERATIONS,
  EntityType.ROLES,
  EntityType.USERS,
  EntityType.EMPLOYEES,
];

export const STORE_ENTITIES: EntityType[] = [
  EntityType.STORES,
  EntityType.ORDERS,
  EntityType.CUSTOMERS,
  EntityType.RETAILERS,
  EntityType.DISCOUNTS,
  EntityType.FAQS,
  EntityType.FILTERS,
  EntityType.BANNERS,
  EntityType.CATEGORIES,
  EntityType.REVIEWS,
  EntityType.PRODUCTS,
  EntityType.VARIANTS,
  EntityType.VARIANT_IMAGES,
  EntityType.NEW_ARRIVALS,
  EntityType.ATTRIBUTES,
  EntityType.COLORS,
  EntityType.SIZES,
  EntityType.TAGS,
  EntityType.PROMOTIONS,
];

export const DIALOGUE_ENTITIES: EntityType[] = [
  EntityType.CHAT,
  EntityType.TESTIMONIALS,
  EntityType.ABOUT_US,
];

export const NOTIFICATION_ENTITIES: EntityType[] = [EntityType.NOTIFICATIONS];

export const TRACKING_ENTITIES: EntityType[] = [
  EntityType.TRACKING,
  EntityType.ORDERS,
];

export const EWMS_W1_ENTITIES: EntityType[] = [
  EntityType.WAREHOUSE_1,
  EntityType.ENTRIES,
  EntityType.WAREHOUSE_TRANSFERS,
  EntityType.SHIPPING_LABELS,
];

export const EWMS_W2_ENTITIES: EntityType[] = [
  EntityType.WAREHOUSE_2,
  EntityType.ENTRIES,
  EntityType.WAREHOUSE_TRANSFERS,
];

export const EWMS_MANAGEMENT_ENTITIES: EntityType[] = [
  EntityType.EWMS_MANAGEMENT,
  EntityType.WAREHOUSES,
];

export const DELIVERY_ENTITIES: EntityType[] = [
  EntityType.DELIVERY_PLANS,
  EntityType.SHIPPING_LABELS,
  EntityType.ORDERS,
];

export const TICKETING_ENTITIES: EntityType[] = [EntityType.TICKETING];

export const ALL_ENTITY_TYPES = Object.values(EntityType);

export const STANDARD_CRUD_OPERATIONS = [
  OperationType.CREATE,
  OperationType.READ,
  OperationType.UPDATE,
  OperationType.DELETE,
];

export const READ_ONLY_OPERATIONS = [OperationType.READ];

export type AccessSection =
  | "settings"
  | "store"
  | "dialogue"
  | "notifications"
  | "tracking"
  | "ewms_w1"
  | "ewms_w2"
  | "ewms_management"
  | "delivery"
  | "ticketing";

export const SECTION_ENTITY_MAP: Record<AccessSection, EntityType[]> = {
  settings: SETTINGS_ENTITIES,
  store: STORE_ENTITIES,
  dialogue: DIALOGUE_ENTITIES,
  notifications: NOTIFICATION_ENTITIES,
  tracking: TRACKING_ENTITIES,
  ewms_w1: EWMS_W1_ENTITIES,
  ewms_w2: EWMS_W2_ENTITIES,
  ewms_management: EWMS_MANAGEMENT_ENTITIES,
  delivery: DELIVERY_ENTITIES,
  ticketing: TICKETING_ENTITIES,
};

export type PermissionPair = {
  entity: string;
  operation: string;
};

export function formatPermissionKey(entity: string, operation: string) {
  return `${entity}:${operation}`;
}

export function buildPermissionKeys(
  entities: EntityType[],
  operations: OperationType[],
) {
  return entities.flatMap((entity) =>
    operations.map((operation) => formatPermissionKey(entity, operation)),
  );
}

export function isSettingsEntity(entityName: string) {
  return SETTINGS_ENTITIES.includes(entityName as EntityType);
}

export function isProtectedRoleName(roleName: string) {
  const normalized = roleName.trim().toLowerCase();
  return (
    normalized === PROTECTED_ROLE_NAMES.SUPER_ADMIN ||
    normalized === PROTECTED_ROLE_NAMES.ADMIN
  );
}
