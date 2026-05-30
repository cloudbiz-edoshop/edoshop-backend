import type { Database } from "..";

import { and, eq, inArray } from "drizzle-orm";

import { EMPLOYEES, RoleType } from "@/constants";

import {
  employees as employeesTable,
  roles as rolesTable,
  users as usersTable,
} from "../models";

export default async function seed(db: Database) {
  // Get employee usernames from constants to identify actual employees
  const employeeUsernames = EMPLOYEES.map((emp) => emp.username);

  const managerRole = await db
    .select({ id: rolesTable.id })
    .from(rolesTable)
    .where(eq(rolesTable.name, RoleType.MANAGER))
    .limit(1);

  if (!managerRole[0]) {
    throw new Error("Manager role not found while seeding employees");
  }

  // Only select users who are actual employees (not customers)
  const employees = await db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.isAdmin, false),
        inArray(usersTable.username, employeeUsernames),
      ),
    );

  for (const employee of employees) {
    const result = await db
      .insert(employeesTable)
      .values({
        userId: employee.id,
        roleId: managerRole[0].id,
        employeeCode: Math.random().toString(),
        createdBy: 1,
        updatedBy: 1,
      })
      .returning();

    await db
      .update(employeesTable)
      .set({
        employeeCode: `EMP-${result[0].id}`,
      })
      .where(eq(employeesTable.id, result[0].id));
  }
}
