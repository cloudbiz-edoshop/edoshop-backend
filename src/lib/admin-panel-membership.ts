/**
 * Returns true when a user is allowed to access the Admin Panel.
 * Team members have an employee record; standalone super admins have isAdmin set.
 */
export function isAdminPanelTeamMemberUser(user: {
  isAdmin: boolean;
  employee?: { isDeleted: boolean } | null;
}): boolean {
  if (user.isAdmin) {
    return true;
  }

  return Boolean(user.employee && !user.employee.isDeleted);
}
