/**
 * Role types available in the application
 * Using enum for better type safety and autocompletion
 */
export enum RoleType {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  MANAGER = "manager",
  AUDITOR = "auditor",
  W1_TECH = "w1_tech",
  W2_TECH = "w2_tech",
  CUSTOMER_SERVICE = "customer_service",
  WAREHOUSE_SUPERVISOR = "warehouse_supervisor",
  DIGITAL_MARKETER = "digital_marketer",
  ROLE_WITH_NO_PERMISSION = "role_with_no_permission",
  ANOTHER_ROLE_WITH_NO_PERMISSION = "Another_role_with_no_permission",
}

/**
 * Provides descriptions for Role types
 */
export const ROLE_DESCRIPTIONS: Record<RoleType, string> = {
  [RoleType.SUPER_ADMIN]: "Super Admin",
  [RoleType.ADMIN]: "Admin",
  [RoleType.MANAGER]: "Manager",
  [RoleType.AUDITOR]: "Auditor",
  [RoleType.W1_TECH]: "W1 Tech",
  [RoleType.W2_TECH]: "W2 Tech",
  [RoleType.CUSTOMER_SERVICE]: "Customer Service",
  [RoleType.WAREHOUSE_SUPERVISOR]: "Warehouse Supervisor",
  [RoleType.DIGITAL_MARKETER]: "Digital Marketer",
  [RoleType.ROLE_WITH_NO_PERMISSION]: "Role with no permission",
  [RoleType.ANOTHER_ROLE_WITH_NO_PERMISSION]: "Another Role with no permission",
};
