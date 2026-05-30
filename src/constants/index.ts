/**
 * Centralizes exports of all constants for easier imports
 */

// Address Type Constants
export {
  ADDRESS_TYPE_DESCRIPTIONS,
  AddressType,
  AddressTypeIds,
} from "./address-types.constants";

// Attribute Type Constants
export {
  ATTRIBUTE_TYPE_DESCRIPTIONS,
  AttributeType,
  AttributeTypeIds,
} from "./attribute-types.constants";

// Bin Constants
export { BINS_DATA } from "./bins.constants";

// Color Constants
export { Colors, COLORS_DESCRIPTIONS } from "./colors.constants";

// Entity Constants
export { ENTITY_DESCRIPTIONS, EntityType } from "./entities.constants";

// Entry State Constants
export {
  ENTRY_STATE_DESCRIPTIONS,
  EntryState,
  EntryStateIds,
} from "./entries/entry-states.constants";

// Entry Type Constants
export {
  ENTRY_TYPE_DESCRIPTIONS,
  EntryType,
  EntryTypeIds,
} from "./entries/entry-types.constants";
// Error Constants
export {
  notFoundSchema,
  ZOD_ERROR_CODES,
  ZOD_ERROR_MESSAGES,
} from "./error.constants";

// Fulfillment State Constants
export { FULFILLMENT_STATES, FULFILLMENT_STATES_DESCRIPTIONS, FULFILLMENT_STATES_STEPS } from "./fulfillment-states.constants";

// Group Criteria Type Constants
export {
  GROUP_CRITERIA_TYPE_DESCRIPTIONS,
  GroupCriteriaType,
} from "./group-criteria-types.constant";

// Notification Frequency Constants
export {
  NOTIFICATION_FREQUENCY_DESCRIPTIONS,
  NotificationFrequency,
  NotificationFrequencyIds,
} from "./notification-frequencies.constants";
// Notification Type Constants
export {
  NOTIFICATION_TYPE_DESCRIPTIONS,
  NotificationType,
  NotificationTypeIds,
} from "./notification-types.constants";

// Ongoing Groups Constants
export { ONGOING_GROUPS } from "./ongoing-groups.constants";

// Operation Constants
export { OperationType } from "./operations.constants";

// Order Item Constants
export {
  ORDER_ITEMS,
} from "./order-items.constant";

// Order Status Constants
export {
  ORDER_STATUS_TYPE_DESCRIPTIONS,
  OrderStatusType,
  OrderStatusTypeIds,
} from "./order-statuses.constants";

// Order Type Constants
export {
  ORDER_TYPE_DESCRIPTIONS,
  OrderType,
  OrderTypeIds,
} from "./order-types.constants";

// Order Constants
export { ORDERS, OrdersNumber } from "./orders.constants";

// Package Constants

// Package Statuses Constants
export { PACKAGE_STATUSES, PACKAGE_STATUSES_DESCRIPTIONS } from "./package-statuses.constants";

// Payment Method Constants
export {
  PAYMENT_METHOD_DESCRIPTIONS,
  PaymentMethod,
} from "./payment-methods.constants";

// Payment Status Constants
export {
  PAYMENT_STATUSES,
  PAYMENT_STATUSES_DESCRIPTIONS,
} from "./payment-statuses.constants";

// Payment Transaction Constants
export {
  PAYMENT_TRANSACTIONS,
} from "./payment-transactions.constants";

// Payment Type Constants
export {
  PAYMENT_TYPE_DESCRIPTIONS,
  PaymentType,
} from "./payment-types.constants";

// Product Store Type Constants
export {
  PRODUCT_STORE_TYPE_DESCRIPTIONS,
  ProductStoreType,
  ProductStoreTypeIds,
} from "./product-store-types.constants";

// Rayon Constants
export { RAYONS_DATA } from "./rayons.constants";

// Recipient Type Constants
export {
  RECIPIENT_TYPE_DESCRIPTIONS,
  RecipientType,
  RecipientTypeIds,
} from "./recipient-types.constants";

// Role Constants
export { ROLE_DESCRIPTIONS, RoleType } from "./roles.constants";

// Shelves Constants
export { SHELVES_DATA } from "./shelves.constants";

// Shipping Label Constants
export { SHIPPING_LABELS } from "./shipping-labels.constants";

// Shipping Priority Code Constants
export {
  SHIPPING_PRIORITY_CODES,
  SHIPPING_PRIORITY_DESCRIPTIONS,
} from "./shipping-priority-codes.constants";

export {
  SHIPPING_TYPES,
  SHIPPING_TYPES_DESCRIPTIONS,
  SHIPPING_TYPES_IDS,
} from "./shipping-types.constants";

// Size Constants
export { Sizes, SIZES_DESCRIPTIONS } from "./sizes.constants";

// Storage Constants
export { STORAGE_DATA } from "./storage.constants";

// Seed Testimonials Constants
export { TESTIMONIALS } from "./testimonials.constants";

// Transfer Status Constants
export {
  TRANSFER_STATUS_DESCRIPTIONS,
  TransferStatus,
  TransferStatusIds,
} from "./transfer-statuses.constants";

// Seed Constants
export { ADMINS, CUSTOMER_USERS, DRIVER_USERS, EMPLOYEES } from "./users.constants";

// Validation Constants
export { constraintAndMessages } from "./validation.constants";

export { WAREHOUSE_TRANSFERS_DATA } from "./warehouse-transfers.constants";

// Response Constants
export const STANDARD_MESSAGES = {
  SUCCESS: {
    CREATED: "Resource created successfully",
    UPDATED: "Resource updated successfully",
    DELETED: "Resource deleted successfully",
    FETCHED: "Resource fetched successfully",
    LISTED: "Resources listed successfully",
  },
  ERROR: {
    NOT_FOUND: "Resource not found",
    UNAUTHORIZED: "Unauthorized access",
    FORBIDDEN: "Forbidden access",
    BAD_REQUEST: "Bad request",
    UNPROCESSABLE_ENTITY: "Unprocessable entity",
    INTERNAL_SERVER_ERROR: "Internal server error",
    VALIDATION_ERROR: "Validation error",
    CONFLICT: "Resource already exists",
    TOO_MANY_REQUESTS: "Too many requests",
  },
  AUTH: {
    LOGIN_SUCCESS: "Login successful",
    LOGOUT_SUCCESS: "Logout successful",
    TOKEN_REFRESHED: "Token refreshed successfully",
    PASSWORD_RESET_REQUEST: "Password reset token sent successfully",
    OTP_VERIFIED: "OTP verified successfully",
    PASSWORD_RESET_SUCCESS: "Password has been reset successfully",
    PASSWORD_UPDATE_SUCCESS: "Password updated successfully",
    CUSTOMER_CREATED: "Customer created successfully",
    USER_REGISTERED_SUCCESSFULLY: "User registered successfully",
  },
  USER: {
    CREATED: "User created successfully",
    UPDATED: "User updated successfully",
    DELETED: "User deleted successfully",
    FETCHED: "User retrieved successfully",
    LISTED: "Users listed successfully",
    NOT_FOUND: "User not found",
  },
  EMPLOYEE: {
    CREATED: "Employee created successfully",
    UPDATED: "Employee updated successfully",
    DELETED: "Employee deleted successfully",
    FETCHED: "Employee retrieved successfully",
    LISTED: "Employees listed successfully",
    NOT_FOUND: "Employee not found",
  },
  SUPPLIER: {
    CREATED: "Supplier created successfully",
    UPDATED: "Supplier updated successfully",
    DELETED: "Supplier deleted successfully",
    FETCHED: "Supplier retrieved successfully",
    LISTED: "Suppliers listed successfully",
    NOT_FOUND: "Supplier not found",
  },
  ROLE: {
    CREATED: "Role created successfully",
    UPDATED: "Role updated successfully",
    DELETED: "Role deleted successfully",
    FETCHED: "Role retrieved successfully",
    LISTED: "Roles listed successfully",
    NOT_FOUND: "Role not found",
  },
  OPERATION: {
    CREATED: "Operation created successfully",
    UPDATED: "Operation updated successfully",
    DELETED: "Operation deleted successfully",
    FETCHED: "Operation retrieved successfully",
    LISTED: "Operations listed successfully",
    NOT_FOUND: "Operation not found",
  },
  ENTITY: {
    CREATED: "Entity created successfully",
    UPDATED: "Entity updated successfully",
    DELETED: "Entity deleted successfully",
    FETCHED: "Entity retrieved successfully",
    LISTED: "Entities listed successfully",
    NOT_FOUND: "Entity not found",
  },
};
