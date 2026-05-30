import type { Database } from "..";

import { inArray } from "drizzle-orm";

import { DRIVER_USERNAMES } from "@/constants/drivers.constants";

import { drivers as driversTable, users as usersTable } from "../models";

export default async function seed(db: Database) {
  const driverUsers = await db
    .select()
    .from(usersTable)
    .where(inArray(usersTable.username, DRIVER_USERNAMES));

  for (const user of driverUsers) {
    await db
      .insert(driversTable)
      .values({ userId: user.id });
  }
}
