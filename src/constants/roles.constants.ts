/**
 * Role types available in the application
 * Using enum for better type safety and autocompletion
 */
export enum RoleType {
  ADMIN = "admin",
  MANAGER = "manager",
  ROLE_WITH_NO_PERMISSION = "role_with_no_permission",
  ANOTHER_ROLE_WITH_NO_PERMISSION = "Another_role_with_no_permission",
}

/**
 * Provides descriptions for Role types
 */
export const ROLE_DESCRIPTIONS: Record<RoleType, string> = {
  [RoleType.ADMIN]: "Admin",
  [RoleType.MANAGER]: "Manager",
  [RoleType.ROLE_WITH_NO_PERMISSION]: "Role with no permission",
  [RoleType.ANOTHER_ROLE_WITH_NO_PERMISSION]: "Another Role with no permission",
};
